import {create} from 'zustand';
import {chatLimits, localKey, type LocalAttachment, type UploadHandle} from './chat';
import {discardLocal, discardUpload, uploadAttachment} from './chat-files';
import {editChat, sendChat, useRoom} from './client';
import type {ChatAttachment, ChatMessage} from './types';

export type PendingAttachment = LocalAttachment & {status: 'uploading' | 'ready' | 'error'; progress: number; remote?: ChatAttachment; error?: string};
/** A message handed to the server but not yet confirmed. Shown immediately (WhatsApp-style) with its real state. */
export type Outgoing = {key: string; text: string; replyTo: ChatMessage | null; attachments: PendingAttachment[]; at: string; status: 'sending' | 'failed'; error?: string};
type Draft = {roomId: string | null; text: string; stash: string; replyTo: ChatMessage | null; editing: ChatMessage | null;
  pending: PendingAttachment[]; sending: boolean; autoSend: boolean; error: string; outbox: Outgoing[]};
const empty: Draft = {roomId: null, text: '', stash: '', replyTo: null, editing: null, pending: [], sending: false, autoSend: false, error: '', outbox: []};
/** The composer draft lives outside the component so switching tabs or a failed send never loses it. */
export const useChatDraft = create<Draft>(() => empty);
const uploads = new Map<string, UploadHandle>();
const set = useChatDraft.setState;
const patch = (key: string, change: Partial<PendingAttachment>) => set(s => ({pending: s.pending.map(x => x.key === key ? {...x, ...change} : x)}));

/** Clears the draft and releases every file it holds: cancels uploads, withdraws unsent server copies, deletes temp files. */
export function resetDraft(roomId: string | null = null) {
  const {pending, outbox, roomId: previous} = useChatDraft.getState();
  for (const item of [...pending, ...outbox.flatMap(x => x.attachments)]) release(previous, item);
  set({...empty, roomId});
}
function release(roomId: string | null, item: PendingAttachment) {
  uploads.get(item.key)?.cancel(); uploads.delete(item.key);
  if (roomId && item.remote) void discardUpload(roomId, item.remote.id);
  discardLocal(item);
}
export function ensureDraftRoom(roomId: string) {if (useChatDraft.getState().roomId !== roomId) resetDraft(roomId);}
export const setDraftText = (text: string) => set({text, error: ''});
export const replyTo = (message: ChatMessage | null) => set(s => ({replyTo: message, editing: null, text: s.editing ? s.stash : s.text, error: ''}));
export function startEditing(message: ChatMessage) {
  set(s => ({editing: message, replyTo: null, stash: s.editing ? s.stash : s.text, text: message.text, error: ''}));
}
export const stopEditing = () => set(s => ({editing: null, text: s.stash, stash: '', error: ''}));

export function addAttachment(item: LocalAttachment, autoSend = false) {
  const state = useChatDraft.getState();
  if (!state.roomId) {discardLocal(item); return;}
  if (state.pending.length >= chatLimits.attachments) {discardLocal(item); set({error: `Puedes enviar hasta ${chatLimits.attachments} adjuntos por mensaje.`}); return;}
  if (item.size > chatLimits.bytes) {discardLocal(item); set({error: 'El archivo supera 10 MB.'}); return;}
  set(s => ({pending: [...s.pending, {...item, status: 'uploading', progress: 0}], autoSend: s.autoSend || autoSend, error: '', editing: null}));
  start(state.roomId, item);
}
function start(roomId: string, item: LocalAttachment, attempt = 0) {
  const handle = uploadAttachment(roomId, item, progress => patch(item.key, {progress}));
  uploads.set(item.key, handle);
  handle.promise.then(remote => {
    if (uploads.get(item.key) !== handle) {void discardUpload(roomId, remote.id); return;}
    uploads.delete(item.key);
    patch(item.key, {status: 'ready', progress: 1, remote});
    const draft = useChatDraft.getState();
    if (draft.autoSend && draft.pending.every(x => x.status === 'ready')) void sendDraft();
  }, (error: Error & {status?: number}) => {
    if (uploads.get(item.key) !== handle) return;
    uploads.delete(item.key);
    // Returning from the system picker can briefly reconnect the room; a presence refusal is retried once.
    if (attempt === 0 && error.status === 403) {
      setTimeout(() => {if (useChatDraft.getState().pending.some(x => x.key === item.key)) start(roomId, item, 1);}, 2500);
      return;
    }
    patch(item.key, {status: 'error', error: error.message});
    set({autoSend: false});
  });
}
export function retryAttachment(key: string) {
  const {roomId, pending} = useChatDraft.getState(); const item = pending.find(x => x.key === key);
  if (!roomId || !item) return;
  patch(key, {status: 'uploading', progress: 0, error: undefined});
  set({error: ''});
  start(roomId, item);
}
export function removeAttachment(key: string) {
  const {roomId, pending} = useChatDraft.getState(); const item = pending.find(x => x.key === key);
  if (item) release(roomId, item);
  set(s => ({pending: s.pending.filter(x => x.key !== key), autoSend: false}));
}

export async function sendDraft() {
  const draft = useChatDraft.getState();
  if (draft.sending || !useRoom.getState().room) return false;
  const text = draft.text.trim();
  if (draft.editing) {
    if (!text && !draft.editing.attachments?.length) return false;
    set({sending: true, error: ''});
    try {await editChat(draft.editing.id, text); set(s => ({editing: null, text: s.stash, stash: '', sending: false})); return true;}
    catch (error) {set({sending: false, error: error instanceof Error ? error.message : 'No se pudo editar.'}); return false;}
  }
  if (draft.pending.some(x => x.status === 'uploading')) {set({autoSend: true}); return false;}
  if (draft.pending.some(x => x.status === 'error')) {set({error: 'Quita o reintenta el adjunto que falló.'}); return false;}
  if (!text && !draft.pending.length) return false;
  // The composer clears at once; the bubble shows "enviando" until the server confirms it.
  const outgoing: Outgoing = {key: localKey(), text, replyTo: draft.replyTo, attachments: draft.pending, at: new Date().toISOString(), status: 'sending'};
  set(s => ({outbox: [...s.outbox, outgoing], text: '', replyTo: null, pending: [], autoSend: false, error: ''}));
  return deliver(outgoing);
}
async function deliver(outgoing: Outgoing) {
  try {
    await sendChat({text: outgoing.text, replyToId: outgoing.replyTo?.id ?? null, attachmentIds: outgoing.attachments.map(x => x.remote!.id)});
    // Sent files now belong to the message: only the local temporary copies are removed.
    for (const item of outgoing.attachments) discardLocal(item);
    set(s => ({outbox: s.outbox.filter(x => x.key !== outgoing.key)}));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo enviar.';
    set(s => ({outbox: s.outbox.map(x => x.key === outgoing.key ? {...x, status: 'failed', error: message} : x)}));
    return false;
  }
}
export function retryOutgoing(key: string) {
  const item = useChatDraft.getState().outbox.find(x => x.key === key);
  if (!item || item.status === 'sending') return;
  set(s => ({outbox: s.outbox.map(x => x.key === key ? {...x, status: 'sending', error: undefined} : x)}));
  void deliver({...item, status: 'sending'});
}
/** Takes a failed message back into the composer to change it (nothing was published). */
export function reviseOutgoing(key: string) {
  const item = useChatDraft.getState().outbox.find(x => x.key === key);
  if (!item || item.status === 'sending') return;
  set(s => ({outbox: s.outbox.filter(x => x.key !== key), text: item.text, replyTo: item.replyTo, pending: [...item.attachments, ...s.pending].slice(0, chatLimits.attachments), editing: null}));
}
export function discardOutgoing(key: string) {
  const {outbox, roomId} = useChatDraft.getState(); const item = outbox.find(x => x.key === key);
  if (!item || item.status === 'sending') return;
  for (const attachment of item.attachments) release(roomId, attachment);
  set(s => ({outbox: s.outbox.filter(x => x.key !== key)}));
}
