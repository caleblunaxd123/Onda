import {Directory, File, Paths, UploadType} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type {AudioSource} from 'expo-audio';
import type {ImageSourcePropType} from 'react-native';
import {apiBase} from '../../api';
import {useAuth} from '../account/session';
import {chatLimits, localKey, uploadError, UploadError, type LocalAttachment, type UploadHandle} from './chat';
import type {ChatAttachment} from './types';

/** Native transport for private chat attachments. The token travels only in the Authorization header. */
export const attachmentUrl = (room: string, id: string) => `${apiBase}/api/v1/rooms/${room}/attachments/${id}`;
const uploadUrl = (room: string) => `${apiBase}/api/v1/rooms/${room}/attachments`;
function authHeaders() {
  const token = useAuth.getState().session?.token;
  if (!token) throw new Error('Tu sesión terminó. Vuelve a entrar.');
  return {Authorization: `Bearer ${token}`};
}
const sharedPrefix = 'onda-chat-';
const uploadPrefix = 'onda-upload-';
export function discardLocal(item: Pick<LocalAttachment, 'uri' | 'temporary'>) {
  if (!item.temporary) return;
  try {const file = new File(item.uri); if (file.exists) file.delete();} catch {/* already gone */}
  // Documents live in their own folder so the upload keeps the real file name; remove that folder too.
  const folder = item.uri.slice(0, item.uri.lastIndexOf('/'));
  if (folder.slice(folder.lastIndexOf('/') + 1).startsWith(uploadPrefix)) try {new Directory(folder).delete();} catch {/* already gone */}
}

export async function voiceAttachmentAsync(uri: string, durationMs: number): Promise<LocalAttachment> {
  return {key: localKey(), uri, name: 'nota-de-voz.m4a', mime: 'audio/mp4', kind: 'audio', size: new File(uri).size, durationMs, temporary: true};
}

export function uploadAttachment(room: string, item: LocalAttachment, onProgress: (fraction: number) => void): UploadHandle {
  const controller = new AbortController();
  const promise = (async () => {
    if (item.size > chatLimits.bytes) throw new Error('El archivo supera 10 MB.');
    const task = new File(item.uri).createUploadTask(uploadUrl(room), {
      httpMethod: 'POST', uploadType: UploadType.MULTIPART, fieldName: 'file', mimeType: item.mime, headers: authHeaders(),
      parameters: item.durationMs ? {durationMs: String(Math.round(item.durationMs))} : {},
      onProgress: progress => onProgress(progress.totalBytes ? progress.bytesSent / progress.totalBytes : 0), signal: controller.signal,
    });
    let result;
    try {result = await task.uploadAsync();}
    catch (error) {if (controller.signal.aborted) throw new Error('Envío cancelado.'); throw new Error(uploadError(0, String(error)));}
    if (result.status < 200 || result.status >= 300) throw new UploadError(uploadError(result.status, result.body), result.status);
    return JSON.parse(result.body) as ChatAttachment;
  })();
  return {promise, cancel: () => controller.abort()};
}

/** Withdraws an uploaded file that was never sent (only the uploader's own unsent file is accepted). */
export async function discardUpload(room: string, id: string) {
  await fetch(attachmentUrl(room, id), {method: 'DELETE', headers: authHeaders()}).catch(() => {});
}

export async function resolveImage(room: string, item: ChatAttachment): Promise<ImageSourcePropType> {
  return {uri: attachmentUrl(room, item.id), headers: authHeaders()};
}
export async function audioSource(room: string, item: ChatAttachment): Promise<AudioSource> {
  return {uri: attachmentUrl(room, item.id), headers: authHeaders()};
}

/** Downloads to the private cache and opens the system share sheet (save to Files, send to another app…). */
export async function saveAttachment(room: string, item: ChatAttachment) {
  const safe = item.name.replace(/[^\w.\-() ]+/g, '_').slice(-80) || 'archivo';
  const target = new File(Paths.cache, `${sharedPrefix}${item.id.slice(0, 8)}-${safe}`);
  if (target.exists) target.delete();
  const file = await File.downloadFileAsync(attachmentUrl(room, item.id), target, {headers: authHeaders(), idempotent: true})
    .catch(() => {throw new Error('No se pudo descargar el archivo. Comprueba la conexión.');});
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos.');
  await Sharing.shareAsync(file.uri, {dialogTitle: item.name, mimeType: item.kind === 'file' ? undefined : item.mime});
}

/** Removes files downloaded for sharing; called when leaving the room. */
export function clearChatCache() {
  try {
    for (const entry of Paths.cache.list()) if (entry instanceof File && entry.name.startsWith(sharedPrefix)) entry.delete();
  } catch {/* cache cleanup is best effort */}
}
