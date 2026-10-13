import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {create} from 'zustand';
import {ApiError, request} from '../../api';

export type Listener = {id: string; displayName: string; email: string | null; guest: boolean};
export type Session = {token: string; expiresAt: string; user: Listener};
export type SessionResponse = Session & {recoveryCode: string | null};
const key = 'onda.listener.session.v1';
type AuthState = {session: Session | null; ready: boolean; storageError: string; setSession: (session: Session | null) => Promise<void>};
export const useAuth = create<AuthState>(set => ({
  session: null, ready: false, storageError: '',
  setSession: async session => {
    const clean = session ? {token: session.token, expiresAt: session.expiresAt, user: session.user} : null;
    set({session: clean, ready: true, storageError: ''});
    try {
      if (Platform.OS === 'web') {
        if (clean) sessionStorage.setItem(key, JSON.stringify(clean));
        else sessionStorage.removeItem(key);
      } else {
        if (clean) await SecureStore.setItemAsync(key, JSON.stringify(clean), {keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
        else await SecureStore.deleteItemAsync(key);
      }
    } catch {set({storageError: 'La sesión está abierta, pero no se pudo guardar. Inicia sesión de nuevo al reiniciar.'});}
  },
}));
let boot: Promise<void> | undefined;
export function initializeSession() {
  return boot ??= (async () => {
    try {
      const raw = Platform.OS === 'web' ? sessionStorage.getItem(key) : await SecureStore.getItemAsync(key);
      const saved = raw ? JSON.parse(raw) as Session : null;
      if (saved?.token && Date.parse(saved.expiresAt) > Date.now()) useAuth.setState({session: saved});
      else if (raw) {
        if (Platform.OS === 'web') sessionStorage.removeItem(key);
        else await SecureStore.deleteItemAsync(key);
      }
    } catch {/* A locked/unavailable keystore leaves guest listening available. */}
    useAuth.setState({ready: true});
  })();
}
export async function accountRequest<T>(path: string, options: Parameters<typeof request<T>>[1] = {}) {
  const session = useAuth.getState().session;
  if (!session) throw new ApiError('Elige un nombre para entrar o inicia sesión.', 401);
  try {return await request<T>(path, {...options, token: session.token});}
  catch (error) {
    if (error instanceof ApiError && error.status === 401) await useAuth.getState().setSession(null);
    throw error;
  }
}
let guestFlight: Promise<Session> | null = null;
export async function ensureListener(name?: string): Promise<Session> {
  await initializeSession();
  const saved = useAuth.getState().session;
  if (saved && Date.parse(saved.expiresAt) > Date.now()) return saved;
  if (guestFlight) return guestFlight;
  guestFlight = (async () => {
    const session = await request<SessionResponse>('/api/v1/auth/guest', {method: 'POST', body: {displayName: name ?? ''}});
    await useAuth.getState().setSession(session); return session;
  })();
  try {return await guestFlight;} finally {guestFlight = null;}
}
export async function signOut() {
  // Keep the session on a network failure so the person can retry server-side revocation.
  await accountRequest<void>('/api/v1/auth/logout', {method: 'POST'});
  await useAuth.getState().setSession(null);
}
