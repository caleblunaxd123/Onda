// Creates only private QA rooms/guests and removes them in finally. Never prints tokens or invite codes.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '../apps/mobile/package.json'));
const signalR = require('@microsoft/signalr');
const api = (process.argv[2] ?? 'http://localhost:5080').replace(/\/$/, '');
const stamp = Date.now().toString(36);
const cleanup = path.join(path.dirname(fileURLToPath(import.meta.url)), '../.tools', `smoke-safety-cleanup-${stamp}.json`);
const sessions = [], connections = [];
let passed = 0, total = 0;
const check = (name, value) => {total++; if (value) passed++; else process.exitCode = 1; console.log(`${value ? 'OK' : 'FAIL'} ${name}`);};
async function http(method, url, session, body) {
  const response = await fetch(api + url, {method, headers: {'Content-Type': 'application/json', ...(session ? {Authorization: 'Bearer ' + session.token} : {})}, body: body === undefined ? undefined : JSON.stringify(body)});
  return {status: response.status, data: await response.json().catch(() => null)};
}
async function guest(label) {
  const value = await http('POST', '/api/v1/auth/guest', null, {displayName: 'QA safety ' + label + ' ' + stamp});
  if (value.status !== 200) throw new Error('Own QA guest creation failed');
  sessions.push(value.data); fs.mkdirSync(path.dirname(cleanup), {recursive: true});
  fs.writeFileSync(cleanup, JSON.stringify(sessions), {mode: 0o600});
  return value.data;
}
async function connect(session) {
  const hub = new signalR.HubConnectionBuilder().withUrl(api + '/hubs/rooms', {transport: signalR.HttpTransportType.WebSockets, skipNegotiation: true, accessTokenFactory: () => session.token}).configureLogging(signalR.LogLevel.None).build();
  connections.push(hub); await hub.start(); return hub;
}
try {
  const a = await guest('A'), b = await guest('B');
  check('blocks require authentication', (await http('GET', '/api/v1/safety/blocks/', null)).status === 401);
  check('initial own block list is empty', (await http('GET', '/api/v1/safety/blocks/', a)).data?.items.length === 0);
  const room = (await http('POST', '/api/v1/rooms/', a, {name: 'QA safety ' + stamp, isPrivate: true, media: {kind: 'youtube'}, provider: 'youtube'})).data;
  const peerRoom = (await http('POST', '/api/v1/rooms/', b, {name: 'QA peer ' + stamp, isPrivate: true, media: {kind: 'youtube'}, provider: 'youtube'})).data;
  if (!room?.id || !peerRoom?.id) throw new Error('Own QA rooms unavailable');
  const owner = await connect(a), peer = await connect(b);
  await owner.invoke('Join', room.id, room.inviteCode); await peer.invoke('Join', room.id, room.inviteCode);
  const message = await peer.invoke('SendChat', room.id, {text: 'QA report evidence', replyToId: null, attachmentIds: []});
  check('reply contract identifies quoted author', (await owner.invoke('SendChat', room.id, {text: 'QA reply', replyToId: message.id, attachmentIds: []})).reply?.senderId === b.user.id);
  const report = {accountId: b.user.id, messageId: message.id, reason: 'QA verification report'};
  check('message report accepted', (await http('POST', `/api/v1/rooms/${room.id}/reports`, a, report)).status === 200);
  check('report retry is accepted', (await http('POST', `/api/v1/rooms/${room.id}/reports`, a, report)).status === 200);
  check('wrong message author rejected', (await http('POST', `/api/v1/rooms/${room.id}/reports`, a, {...report, accountId: a.user.id})).status === 404);
  check('moderator access is disabled by default', (await http('GET', '/api/v1/moderation/access', a)).data?.allowed === false);
  check('private reports reject unprivileged user', (await http('GET', '/api/v1/moderation/reports', a)).status === 403);
  check('moderation action rejects unprivileged user', (await http('POST', '/api/v1/moderation/reports/1/review', a, {action: 'dismiss', note: 'QA request must be denied'})).status === 403);
  check('self block rejected', (await http('PUT', '/api/v1/safety/blocks/' + a.user.id, a, {})).status === 400);
  const revoked = new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), 5000);
    peer.on('AccessChanged', (id, person) => {if (id === room.id && person === b.user.id) {clearTimeout(timer); resolve(true);}});
  });
  check('block saved', (await http('PUT', '/api/v1/safety/blocks/' + b.user.id, a, {})).status === 204);
  check('active room access revoked', await revoked);
  check('block write is idempotent', (await http('PUT', '/api/v1/safety/blocks/' + b.user.id, a, {})).status === 204);
  const list = (await http('GET', '/api/v1/safety/blocks/', a)).data;
  check('block persisted exactly once', list?.items.length === 1 && list.items[0].id === b.user.id);
  check('other account cannot read my block list', (await http('GET', '/api/v1/safety/blocks/', b)).data?.items.length === 0);
  check('blocked guest cannot rejoin even with valid invitation', await peer.invoke('Join', room.id, room.inviteCode).then(() => false, () => true));
  check('owner cannot enter blocked person room either', (await http('GET', '/api/v1/rooms/invite/' + peerRoom.inviteCode, a)).status === 404);
  check('unblock saved', (await http('DELETE', '/api/v1/safety/blocks/' + b.user.id, a)).status === 204);
  // Revocation also closes the affected connection. Reconnect after unblock instead of reusing that socket.
  const returning = await connect(b);
  check('unblocked guest can rejoin', (await returning.invoke('Join', room.id, room.inviteCode)).id === room.id);
  check('block list now empty', (await http('GET', '/api/v1/safety/blocks/', a)).data?.items.length === 0);
} catch (error) {
  check('safety smoke completed', false); console.error('Safety smoke failed:', error.message);
} finally {
  await Promise.all(connections.map(hub => hub.stop().catch(() => {})));
  let cleaned = true;
  for (const session of [...sessions].reverse()) {
    const value = await http('DELETE', '/api/v1/auth/account', session, {password: null}).catch(() => ({status: 0}));
    if (value.status !== 204) cleaned = false;
  }
  check('own QA accounts/rooms cleaned', cleaned);
  if (cleaned) fs.rmSync(cleanup, {force: true});
  console.log(`${passed}/${total} safety checks passed`);
}
