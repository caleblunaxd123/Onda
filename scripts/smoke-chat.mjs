// Two-client end-to-end check of the persistent room chat against a running API.
// Usage: node scripts/smoke-chat.mjs [apiBase]   (default http://localhost:5080)
// Creates its own QA guests and room, and deletes them at the end (accounts, room, chat and files).
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), '../apps/mobile/package.json'));
const signalR = require('@microsoft/signalr');
const api = (process.argv[2] ?? 'http://localhost:5080').replace(/\/$/, '');
const stamp = Date.now().toString(36).slice(-5);
const checks = [];
const ok = (name, value) => {checks.push([name, !!value]); console.log(`${value ? 'OK ' : 'FAIL'} ${name}`); if (!value) process.exitCode = 1;};
async function http(method, url, token, body, headers = {}) {
  const response = await fetch(api + url, {method, headers: {...(token ? {Authorization: `Bearer ${token}`} : {}), ...(body && !(body instanceof FormData) ? {'Content-Type': 'application/json'} : {}), ...headers},
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined});
  const text = await response.text();
  return {status: response.status, json: text ? (() => {try {return JSON.parse(text);} catch {return text;}})() : null};
}
const guest = async name => (await http('POST', '/api/v1/auth/guest', null, {displayName: name})).json;
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
  const updated = waitFor(b, 'MessageUpdated', m => m.id === first.id && !!m.editedAt);
  await a.invoke('EditChat', room.id, {messageId: first.id, text: 'Hola sala (editado)'});
  ok('edit broadcast with edited mark', (await updated).text === 'Hola sala (editado)');
  ok('other person cannot edit', await b.invoke('EditChat', room.id, {messageId: first.id, text: 'x'}).then(() => false, () => true));
  ok('legacy SendMessage still works', await a.invoke('SendMessage', room.id, 'Cliente anterior').then(() => true, () => false));

  const photo = await http('POST', `/api/v1/rooms/${room.id}/attachments`, leo.token, form(png, 'foto.png', 'image/png'));
  ok('photos are not accepted in room chat', photo.status === 400 && String(photo.json?.detail ?? '').includes('notas de voz'));
  const doc = await http('POST', `/api/v1/rooms/${room.id}/attachments`, leo.token, form(Buffer.from('%PDF-1.4 qa'), 'guia.pdf', 'application/octet-stream'));
  ok('files are not accepted in room chat', doc.status === 400);
  const voice = await http('POST', `/api/v1/rooms/${room.id}/attachments`, leo.token, form(m4a, 'nota.m4a', 'audio/mp4', {durationMs: '4200'}));
  ok('voice note upload with duration', voice.status === 200 && voice.json.kind === 'audio' && voice.json.durationMs === 4200);
  ok('fake audio rejected by signature', (await http('POST', `/api/v1/rooms/${room.id}/attachments`, leo.token, form(Buffer.from('not audio'), 'x.m4a', 'audio/mp4'))).status === 400);
  ok('unsent upload hidden from others', (await http('GET', `/api/v1/rooms/${room.id}/attachments/${voice.json.id}`, ana.token)).status === 404);
  const withFiles = await b.invoke('SendChat', room.id, {text: '', replyToId: null, attachmentIds: [voice.json.id]});
  ok('voice note message', withFiles.attachments.length === 1);
  const fetched = await http('GET', `/api/v1/rooms/${room.id}/attachments/${voice.json.id}`, ana.token);
  ok('member downloads sent voice note', fetched.status === 200);
  ok('outsider cannot download', (await http('GET', `/api/v1/rooms/${room.id}/attachments/${voice.json.id}`, eve.token)).status === 403);
  ok('no token cannot download', (await http('GET', `/api/v1/rooms/${room.id}/attachments/${voice.json.id}`, null)).status === 401);
  ok('attachment reused is rejected', await a.invoke('SendChat', room.id, {text: 'x', replyToId: null, attachmentIds: [voice.json.id]}).then(() => false, () => true));

  const deleted = waitFor(a, 'MessageUpdated', m => m.id === withFiles.id && m.deleted);
  await b.invoke('DeleteChat', room.id, {messageId: withFiles.id});
  ok('author deletes for everyone', (await deleted).attachments.length === 0);
  ok('deleted files are gone', (await http('GET', `/api/v1/rooms/${room.id}/attachments/${voice.json.id}`, ana.token)).status === 404);
  const moderated = await a.invoke('DeleteChat', room.id, {messageId: reply.id});
  ok('owner moderates others', moderated.deleted);
  const history = await b.invoke('History', room.id);
  ok('history persists order and tombstones', history.filter(m => m.kind !== 'system').map(m => m.id).join() === [first.id, reply.id].join() + ',' + history.filter(m => m.kind !== 'system')[2].id + ',' + withFiles.id);

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
  for (const person of [ana, leo, eve]) if (person?.token) await http('DELETE', '/api/v1/auth/account', person.token, {password: null});
  if (room?.id) ok('cleanup: QA room no longer listed', (await http('GET', '/api/v1/rooms', null)).json?.items?.every(x => x.id !== room.id) ?? true);
  console.log(`${checks.filter(x => x[1]).length}/${checks.length} checks passed against ${api}`);
}
