import {describe, expect, it} from 'vitest';
import {addTyping, canDelete, canEdit, clearTyping, continuesGroup, dayLabel, describeMessage, linkParts, formatBytes, formatDuration, mergeMessages, myReaction, oldestPersisted,
  pruneTyping, quoteOf, summarizeReactions, typingLabel, upsertMessage} from './chat';
import type {ChatMessage} from './types';

const at = (s: number) => new Date(Date.UTC(2026, 9, 13, 20, 0, s)).toISOString();
const msg = (id: string, s: number, extra: Partial<ChatMessage> = {}): ChatMessage =>
  ({id, senderId: 'ana', sender: 'Ana', text: 'Hola ' + id, kind: 'text', at: at(s), revision: 1, ...extra});

describe('room chat state', () => {
  it('keeps the original order when a message is edited or reacted to', () => {
    const list = [msg('a', 1), msg('b', 2), msg('c', 3)];
    const edited = upsertMessage(list, {...list[0], text: 'Editado', editedAt: at(9), revision: 2});
    expect(edited.map(x => x.id)).toEqual(['a', 'b', 'c']);
    expect(edited[0].text).toBe('Editado');
  });
  it('ignores a late event with an older revision', () => {
    const list = [msg('a', 1, {text: 'v3', revision: 3})];
    expect(upsertMessage(list, msg('a', 1, {text: 'v2', revision: 2}))[0].text).toBe('v3');
  });
  it('inserts live messages in time order without duplicates and caps memory', () => {
    let list = [msg('a', 1), msg('c', 3)];
    list = upsertMessage(list, msg('b', 2));
    list = upsertMessage(list, msg('b', 2));
    expect(list.map(x => x.id)).toEqual(['a', 'b', 'c']);
    expect(upsertMessage(list, msg('d', 4), 3).map(x => x.id)).toEqual(['b', 'c', 'd']);
  });
  it('refreshes reply quotes when the original is edited or deleted', () => {
    const original = msg('a', 1);
    const reply = msg('b', 2, {senderId: 'leo', sender: 'Leo', replyToId: 'a', reply: quoteOf(original)});
    let list = upsertMessage(upsertMessage([], original), reply);
    list = upsertMessage(list, {...original, text: 'Cambié de idea', revision: 2});
    expect(list[1].reply?.text).toBe('Cambié de idea');
    list = upsertMessage(list, {...original, text: 'Mensaje eliminado', deleted: true, revision: 3});
    expect(list[1].reply).toEqual({id: 'a', sender: 'Ana', text: 'Mensaje eliminado', deleted: true});
  });
  it('merges history pages and reconnection snapshots by revision', () => {
    const current = [msg('b', 2, {text: 'nuevo', revision: 4}), msg('c', 3)];
    const page = [msg('a', 1), msg('b', 2, {text: 'viejo', revision: 2})];
    const merged = mergeMessages(current, page);
    expect(merged.map(x => x.id)).toEqual(['a', 'b', 'c']);
    expect(merged[1].text).toBe('nuevo');
    expect(oldestPersisted([{...msg('s', 0), kind: 'system'}, ...merged])?.id).toBe('a');
  });
  it('labels attachment-only quotes like the server', () => {
    const photo = msg('p', 1, {text: '', attachments: [{id: 'f', name: 'x.jpg', mime: 'image/jpeg', kind: 'image', length: 10}]});
    expect(quoteOf(photo).text).toBe('Foto');
    expect(describeMessage(msg('v', 1, {text: '', attachments: [{id: 'g', name: 'nota.m4a', mime: 'audio/mp4', kind: 'audio', length: 10, durationMs: 65000}]})))
      .toBe('Nota de voz de 1:05');
  });
  it('summarizes reactions with counts and the own selection', () => {
    const message = msg('a', 1, {reactions: [{accountId: 'ana', name: 'Ana', emoji: '🔥'}, {accountId: 'leo', name: 'Leo', emoji: '🔥'}, {accountId: 'eva', name: 'Eva', emoji: '❤️'}]});
    expect(summarizeReactions(message, 'leo')).toEqual([
      {emoji: '🔥', count: 2, mine: true, names: ['Ana', 'Leo']}, {emoji: '❤️', count: 1, mine: false, names: ['Eva']}]);
    expect(myReaction(message, 'eva')).toBe('❤️');
  });
  it('allows editing only own live messages inside 15 minutes and owner moderation for deletes', () => {
    const message = msg('a', 0);
    const start = Date.parse(message.at);
    expect(canEdit(message, 'ana', start + 14 * 60000)).toBe(true);
    expect(canEdit(message, 'ana', start + 16 * 60000)).toBe(false);
    expect(canEdit(message, 'leo', start)).toBe(false);
    expect(canEdit({...message, deleted: true}, 'ana', start)).toBe(false);
    expect(canDelete(message, 'leo', false)).toBe(false);
    expect(canDelete(message, 'leo', true)).toBe(true);
    expect(canDelete({...message, kind: 'system'}, 'ana', true)).toBe(false);
  });
  it('expires typing indicators and clears them when the message arrives', () => {
    let map = addTyping({}, {senderId: 'leo', sender: 'Leo'}, 1000);
    map = addTyping(map, {senderId: 'eva', sender: 'Eva'}, 2000);
    expect(typingLabel(map, [], 3000)).toBe('Leo y Eva están escribiendo…');
    expect(typingLabel(map, ['eva'], 3000)).toBe('Leo está escribiendo…');
    expect(typingLabel(map, [], 6500)).toBe('Eva está escribiendo…');
    expect(Object.keys(pruneTyping(map, 8000))).toEqual([]);
    expect(Object.keys(clearTyping(map, 'leo'))).toEqual(['eva']);
  });
  it('formats sizes and durations for attachments', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1,5 MB');
    expect(formatDuration(184400)).toBe('3:04');
  });
});

describe('whatsapp-style presentation', () => {
  it('labels days relative to the device date', () => {
    const now = new Date(2026, 9, 13, 21, 0);
    expect(dayLabel(new Date(2026, 9, 13, 0, 5).toISOString(), now)).toBe('Hoy');
    expect(dayLabel(new Date(2026, 9, 12, 23, 59).toISOString(), now)).toBe('Ayer');
    expect(dayLabel(new Date(2026, 9, 10, 12).toISOString(), now)).toMatch(/10/);
  });
  it('groups consecutive messages of one person within three minutes', () => {
    expect(continuesGroup(msg('a', 0), msg('b', 100))).toBe(true);
    expect(continuesGroup(msg('a', 0), msg('b', 100, {senderId: 'leo'}))).toBe(false);
    expect(continuesGroup(msg('a', 0), {...msg('b', 0), at: new Date(Date.parse(at(0)) + 4 * 60000).toISOString()})).toBe(false);
    expect(continuesGroup({...msg('a', 0), kind: 'system'}, msg('b', 1))).toBe(false);
    expect(continuesGroup(undefined, msg('b', 1))).toBe(false);
  });
  it('turns only https links into tappable parts and leaves punctuation out', () => {
    expect(linkParts('Mira https://onda.lunalav.pe/room?code=AB12. y http://x.com')).toEqual([
      {text: 'Mira '}, {text: 'https://onda.lunalav.pe/room?code=AB12', url: 'https://onda.lunalav.pe/room?code=AB12'}, {text: '. y http://x.com'}]);
    expect(linkParts('sin enlaces')).toEqual([{text: 'sin enlaces'}]);
  });
});
