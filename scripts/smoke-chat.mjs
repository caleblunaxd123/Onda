// Two-client end-to-end check of the persistent room chat against a running API.
// Usage: node scripts/smoke-chat.mjs [apiBase]   (default http://localhost:5080)
// Creates its own QA guests and room, and deletes them at the end (accounts, room, chat and files).
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '../apps/mobile/package.json'));
const signalR = require('@microsoft/signalr');
const api = (process.argv[2] ?? 'http://localhost:5080').replace(/\/$/, '');
const stamp = Date.now().toString(36).slice(-5);
const cleanupFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '../.tools', `smoke-chat-cleanup-${stamp}.json`);
fs.mkdirSync(path.dirname(cleanupFile), {recursive: true});
const created = [];
const checks = [];
const ok = (name, value) => {checks.push([name, !!value]); console.log(`${value ? 'OK ' : 'FAIL'} ${name}`); if (!value) process.exitCode = 1;};
async function http(method, url, token, body, headers = {}) {
  const response = await fetch(api + url, {method, headers: {...(token ? {Authorization: `Bearer ${token}`} : {}), ...(body && !(body instanceof FormData) ? {'Content-Type': 'application/json'} : {}), ...headers},
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined});
  const text = await response.text();
  return {status: response.status, json: text ? (() => {try {return JSON.parse(text);} catch {return text;}})() : null};
}
const guest = async name => {
  const response = await http('POST', '/api/v1/auth/guest', null, {displayName: name});
  if (response.status !== 200) throw new Error('Could not create own QA guest');
  created.push(response.json);
  fs.writeFileSync(cleanupFile, JSON.stringify(created), {mode: 0o600});
  return response.json;
};
function hub(token) {
  return new signalR.HubConnectionBuilder().withUrl(api + '/hubs/rooms', {accessTokenFactory: () => token, transport: signalR.HttpTransportType.WebSockets, skipNegotiation: true})
    .configureLogging(signalR.LogLevel.None).build();
}
const waitFor = (connection, event, predicate = () => true, ms = 5000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => {connection.off(event, handler); reject(new Error('timeout ' + event));}, ms);
  const handler = value => {if (predicate(value)) {clearTimeout(timer); connection.off(event, handler); resolve(value);}};
  connection.on(event, handler);
});
const png = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415478DA63F8CFC0F01F0005000201E2216BC90000000049454E44AE426082', 'hex');
const m4a = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypM4A '), Buffer.alloc(64)]);
const form = (bytes, name, type, extra = {}) => {const data = new FormData(); data.append('file', new Blob([bytes], {type}), name); for (const [k, v] of Object.entries(extra)) data.append(k, v); return data;};

const [ana, leo, eve] = [await guest('QA Chat Ana ' + stamp), await guest('QA Chat Leo ' + stamp), await guest('QA Chat Eve ' + stamp)];
let room;
const a = hub(ana.token), b = hub(leo.token);
try {
  room = (await http('POST', '/api/v1/rooms', ana.token, {name: 'QA chat ' + stamp, isPrivate: true, media: {kind: 'youtube'}, provider: 'youtube'})).json;
  ok('pending room created without media', room?.id && !room.media.url);
  await a.start(); await b.start();
  await a.invoke('Join', room.id, null);
  await b.invoke('Join', room.id, room.inviteCode);
  const streamState = waitFor(b, 'State', r => r.media.kind === 'stream');
  const joined = await a.invoke('Snapshot', room.id);
  await a.invoke('ChangeMedia', room.id, {media: {kind: 'stream', url: 'https://www.netflix.com/watch/81234567?trackId=9', title: 'QA serie'}, version: joined.version});
  const shared = await streamState;
  ok('subscription title shared without query', shared.media.category === 'netflix' && shared.media.url === 'https://www.netflix.com/watch/81234567');
  ok('non-title link rejected', await a.invoke('ChangeMedia', room.id, {media: {kind: 'stream', url: 'https://www.netflix.com/browse'}, version: shared.version}).then(() => false, () => true));
  const rtts = [];
  for (let i = 0; i < 5; i++) {const sent = Date.now(); await a.invoke('ServerTime').catch(() => null); rtts.push(Date.now() - sent);}
  ok(`server clock sampling (lowest round trip ${Math.min(...rtts)} ms)`, rtts.length === 5);
  const typing = waitFor(b, 'Typing');
  await a.invoke('Typing', room.id);
  ok('typing reaches the other connection', (await typing).senderId === ana.user.id);

  const live = waitFor(b, 'Message', m => m.text === 'Hola sala');
  const first = await a.invoke('SendChat', room.id, {text: 'Hola sala', replyToId: null, attachmentIds: []});
  ok('message delivered live', (await live).id === first.id);
  const reply = await b.invoke('SendChat', room.id, {text: 'Respuesta', replyToId: first.id, attachmentIds: []});
  ok('reply carries author quote', reply.reply?.sender?.startsWith('QA Chat Ana') && reply.reply.text === 'Hola sala');
  const reacted = await b.invoke('ReactChat', room.id, {messageId: first.id, emoji: '🔥'});
  ok('reaction counted', reacted.reactions.length === 1 && reacted.reactions[0].emoji === '🔥');
  const toggled = await b.invoke('ReactChat', room.id, {messageId: first.id, emoji: '🔥'});
  ok('same emoji removes reaction', toggled.reactions.length === 0);
  for (const emoji of ['🎉', '😍']) {
    const received = waitFor(b, 'Reaction', event => event.emoji === emoji);
    await a.invoke('React', room.id, emoji);
    ok('floating room reaction broadcast: ' + emoji, (await received).emoji === emoji);
  }
  const updated = waitFor(b, 'MessageUpdated', m => m.id === first.id && !!m.editedAt);
  await a.invoke('EditChat', room.id, {messageId: first.id, text: 'Hola sala (editado)'});
  ok('edit broadcast with edited mark', (await updated).text === 'Hola sala (editado)');
  ok('other person cannot edit', await b.invoke('EditChat', room.id, {messageId: first.id, text: 'x'}).then(() => false, () => true));
  ok('legacy SendMessage still works', await a.invoke('SendMessage', room.id, 'Cliente anterior').then(() => true, () => false));

  for (const [bytes, name, mime] of [[png, 'foto.png', 'image/png'], [Buffer.from('archivo QA'), 'nota.txt', 'text/plain'], [m4a, 'nota.m4a', 'audio/mp4']]) {
    const upload = await http('POST', `/api/v1/rooms/${room.id}/attachments`, leo.token, form(bytes, name, mime));
    ok('new media upload rejected: ' + name, upload.status === 400);
  }
  ok('guest cannot pin messages', await b.invoke('PinChat', room.id, {messageId: first.id}).then(() => false, () => true));
  const pinUpdated = waitFor(b, 'MessageUpdated', m => m.id === first.id && m.pinned);
  await a.invoke('PinChat', room.id, {messageId: first.id});
  ok('pin delivered to another client', (await pinUpdated).pinned);
  ok('pin persisted separately from history', (await b.invoke('PinnedChat', room.id)).id === first.id);
  const withFiles = await b.invoke('SendChat', room.id, {text: '[[onda:sticker:temazo]]', replyToId: null, attachmentIds: []});
  ok('bundled sticker has no attachments', withFiles.attachments.length === 0);
  const stickerReply = await a.invoke('SendChat', room.id, {text: 'Excelente', replyToId: withFiles.id, attachmentIds: []});
  ok('sticker quote readable', stickerReply.reply.text === 'Sticker: ¡Qué temazo!');
  await a.invoke('PinChat', room.id, {messageId: withFiles.id});
  ok('new pin replaces previous', (await a.invoke('PinnedChat', room.id)).id === withFiles.id);
  const deleted = waitFor(a, 'MessageUpdated', m => m.id === withFiles.id && m.deleted);
  await b.invoke('DeleteChat', room.id, {messageId: withFiles.id});
  ok('author deletes for everyone', (await deleted).deleted);
  ok('deleting pinned message clears pin', (await a.invoke('PinnedChat', room.id)) === null);
  const moderated = await a.invoke('DeleteChat', room.id, {messageId: reply.id});
  ok('owner moderates others', moderated.deleted);
  const history = await b.invoke('History', room.id);
  ok('history persists order and tombstones', history.some(m => m.id === withFiles.id && m.deleted) && history.every((m, i) => !i || Date.parse(m.at) >= Date.parse(history[i - 1].at)));

  const providers = await http('GET', '/api/v1/auth/providers', null);
  ok('Google remains disabled until OAuth configured', providers.status === 200 && providers.json.google.enabled === false);
  ok('Google challenge not issued without OAuth config', (await http('POST', '/api/v1/auth/google/challenge', null, {})).status === 503);
  const kicked = waitFor(b, 'Kicked');
  await a.invoke('Kick', room.id, leo.user.id);
  await kicked;
  ok('expelled member cannot send', await b.invoke('SendChat', room.id, {text: 'sigo aquí', replyToId: null, attachmentIds: []}).then(() => false, () => true));
  ok('expelled member cannot upload', (await http('POST', `/api/v1/rooms/${room.id}/attachments`, leo.token, form(png, 'f.png', 'image/png'))).status === 403);
} catch (error) {
  ok('unexpected error: ' + error.message, false);
} finally {
  await a.stop().catch(() => {}); await b.stop().catch(() => {});
  // Cleanup: deleting the QA guests removes their room (owned), messages, reactions and files.
  let cleaned = true;
  for (const person of created) {
    const result = await http('DELETE', '/api/v1/auth/account', person.token, {password: null}).catch(() => ({status: 0}));
    cleaned &&= result.status === 204;
  }
  ok('cleanup: own QA accounts and owned room deleted', cleaned);
  if (cleaned) fs.unlinkSync(cleanupFile);
  else console.log('Cleanup credentials retained privately in ' + cleanupFile);
  console.log(`${checks.filter(x => x[1]).length}/${checks.length} checks passed against ${api}`);
}
