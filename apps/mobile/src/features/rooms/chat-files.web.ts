import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {ImageManipulator, SaveFormat} from 'expo-image-manipulator';
import type {AudioSource} from 'expo-audio';
import type {ImageSourcePropType} from 'react-native';
import {apiBase} from '../../api';
import {useAuth} from '../account/session';
import {chatLimits, localKey, uploadError, type LocalAttachment, type UploadHandle} from './chat';
import type {ChatAttachment} from './types';

/** Web transport: files are fetched with the Authorization header into object URLs; tokens never go into a URL. */
export const attachmentUrl = (room: string, id: string) => `${apiBase}/api/v1/rooms/${room}/attachments/${id}`;
const uploadUrl = (room: string) => `${apiBase}/api/v1/rooms/${room}/attachments`;
function authHeaders() {
  const token = useAuth.getState().session?.token;
  if (!token) throw new Error('Tu sesión terminó. Vuelve a entrar.');
  return {Authorization: `Bearer ${token}`};
}
const objectUrls = new Map<string, Promise<string>>();
export function discardLocal(item: Pick<LocalAttachment, 'uri' | 'temporary'>) {
  if (item.temporary && item.uri.startsWith('blob:')) URL.revokeObjectURL(item.uri);
}

export async function pickImage(): Promise<LocalAttachment | null> {
  const result = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false});
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > 2048) context.resize(asset.width >= asset.height ? {width: 2048} : {height: 2048});
  const saved = await (await context.renderAsync()).saveAsync({compress: 0.82, format: SaveFormat.JPEG});
  const blob = await (await fetch(saved.uri)).blob();
  const uri = URL.createObjectURL(blob);
  return {key: localKey(), uri, name: 'foto.jpg', mime: 'image/jpeg', kind: 'image', size: blob.size, width: saved.width, height: saved.height, temporary: true, blob};
}

export async function pickDocument(): Promise<LocalAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({multiple: false});
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const blob = asset.file ?? await (await fetch(asset.uri)).blob();
  return {key: localKey(), uri: asset.uri, name: asset.name || 'archivo', mime: 'application/octet-stream', kind: 'file', size: blob.size, blob};
}

export async function voiceAttachmentAsync(uri: string, durationMs: number): Promise<LocalAttachment> {
  const blob = await (await fetch(uri)).blob();
  const type = blob.type.startsWith('audio/') ? blob.type.split(';')[0] : 'audio/webm';
  return {key: localKey(), uri, name: type === 'audio/mp4' ? 'nota-de-voz.m4a' : 'nota-de-voz.webm', mime: type, kind: 'audio', size: blob.size, durationMs, temporary: true, blob};
}

export function uploadAttachment(room: string, item: LocalAttachment, onProgress: (fraction: number) => void): UploadHandle {
  const request = new XMLHttpRequest();
  const promise = new Promise<ChatAttachment>((resolve, reject) => {
    if (item.size > chatLimits.bytes) {reject(new Error('El archivo supera 10 MB.')); return;}
    const form = new FormData();
    const blob = item.blob ?? new Blob([]);
    form.append('file', new Blob([blob], {type: item.mime}), item.name);
    if (item.durationMs) form.append('durationMs', String(Math.round(item.durationMs)));
    request.open('POST', uploadUrl(room));
    for (const [key, value] of Object.entries(authHeaders())) request.setRequestHeader(key, value);
    request.upload.onprogress = event => {if (event.lengthComputable) onProgress(event.loaded / event.total);};
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve(JSON.parse(request.responseText) as ChatAttachment);
      else reject(new Error(uploadError(request.status, request.responseText)));
    };
    request.onerror = () => reject(new Error(uploadError(0, '')));
    request.onabort = () => reject(new Error('Envío cancelado.'));
    request.send(form);
  });
  return {promise, cancel: () => request.abort()};
}

export async function discardUpload(room: string, id: string) {
  await fetch(attachmentUrl(room, id), {method: 'DELETE', headers: authHeaders()}).catch(() => {});
}

function objectUrl(room: string, item: ChatAttachment) {
  let pending = objectUrls.get(item.id);
  if (!pending) {
    pending = fetch(attachmentUrl(room, item.id), {headers: authHeaders()}).then(async response => {
      if (!response.ok) throw new Error('No se pudo abrir el adjunto.');
      return URL.createObjectURL(await response.blob());
    });
    pending.catch(() => objectUrls.delete(item.id));
    objectUrls.set(item.id, pending);
  }
  return pending;
}
export async function resolveImage(room: string, item: ChatAttachment): Promise<ImageSourcePropType> {return {uri: await objectUrl(room, item)};}
export async function audioSource(room: string, item: ChatAttachment): Promise<AudioSource> {return objectUrl(room, item);}

export async function saveAttachment(room: string, item: ChatAttachment) {
  const url = await objectUrl(room, item);
  const link = document.createElement('a');
  link.href = url; link.download = item.name; link.rel = 'noopener';
  document.body.appendChild(link); link.click(); link.remove();
}

export function clearChatCache() {
  for (const pending of objectUrls.values()) void pending.then(url => URL.revokeObjectURL(url)).catch(() => {});
  objectUrls.clear();
}
