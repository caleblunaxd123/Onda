import {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {request} from '../../api';
import {Button, Muted} from '../../ui';
import {useAuth, type SessionResponse} from './session';
import type {GoogleProvider} from './google';

type GoogleApi = {accounts: {id: {
  initialize: (config: {client_id: string; nonce: string; callback: (value: {credential: string}) => void}) => void;
  renderButton: (element: HTMLElement, options: {type: 'standard'; theme: 'outline'; size: 'large'; text: 'continue_with'; locale: 'es'; width: number}) => void;
}}};
declare global {interface Window {google?: GoogleApi}}
let script: Promise<GoogleApi> | undefined;
function googleApi() {
  return script ??= new Promise((resolve, reject) => {
    const element = document.createElement('script'); element.src = 'https://accounts.google.com/gsi/client'; element.async = true;
    element.onload = () => {if (window.google) resolve(window.google); else {script = undefined; reject(new Error('No se pudo iniciar Google.'));}};
    element.onerror = () => {script = undefined; element.remove(); reject(new Error('No se pudo cargar Google. Comprueba tu conexión.'));};
    document.head.appendChild(element);
  });
}
export function GoogleLoginButton({onSession, onError}: {onSession: (session: SessionResponse) => void; onError: (message: string) => void}) {
  const provider = useQuery({queryKey: ['auth-providers'], queryFn: () => request<GoogleProvider>('/api/v1/auth/providers'), retry: 1});
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const enabled = !!provider.data?.google.enabled && !!provider.data.google.webClientId;
  const current = useRef({onSession, onError});
  useEffect(() => {current.current = {onSession, onError};}, [onSession, onError]);
  useEffect(() => {
    if (!open || !enabled) return;
    let active = true;
    void Promise.all([googleApi(), request<{nonce: string}>('/api/v1/auth/google/challenge', {method: 'POST'})]).then(([google, {nonce}]) => {
      if (!active || !container.current) return;
      google.accounts.id.initialize({client_id: provider.data!.google.webClientId!, nonce, callback: ({credential}) => {
        if (!active) return; setBusy(true);
        void request<SessionResponse>('/api/v1/auth/google', {method: 'POST', token: useAuth.getState().session?.token, body: {idToken: credential, nonce}})
          .then(async session => {if (!active) return; await useAuth.getState().setSession(session); current.current.onSession(session);})
          .catch(error => {if (active) current.current.onError(error.message);})
          .finally(() => {if (active) {setBusy(false); setOpen(false);}});
      }});
      google.accounts.id.renderButton(container.current, {type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', locale: 'es', width: 300});
    }).catch(error => {if (active) {current.current.onError(error.message); setOpen(false);}});
    return () => {active = false;};
  }, [open, enabled, provider.data]);
  return <View style={{gap: 6}}>
    {open && enabled ? <div ref={container} style={{minHeight: 44, display: 'flex', justifyContent: 'center', pointerEvents: busy ? 'none' : 'auto'}}/>
      : <Button title="Continuar con Google" secondary icon="logo-google" disabled={!enabled} onPress={() => setOpen(true)}/>}
    {!enabled && <Muted style={{fontSize: 11, textAlign: 'center'}}>Google estará disponible pronto. Puedes usar tu correo.</Muted>}
  </View>;
}
