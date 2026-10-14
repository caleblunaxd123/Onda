import {useState} from 'react';
import {Platform, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {request} from '../../api';
import {Button, Muted} from '../../ui';
import {useAuth, type SessionResponse} from './session';

export type GoogleProvider = {google: {enabled: boolean; webClientId: string | null; iosClientId: string | null}};
export function GoogleLoginButton({onSession, onError}: {onSession: (session: SessionResponse) => void; onError: (message: string) => void}) {
  const [busy, setBusy] = useState(false);
  const provider = useQuery({queryKey: ['auth-providers'], queryFn: () => request<GoogleProvider>('/api/v1/auth/providers'), retry: 1});
  const config = provider.data?.google;
  const enabled = !!config?.enabled && !!config.webClientId && (Platform.OS !== 'ios' || !!config.iosClientId);
  const login = async () => {
    if (!enabled || busy) return;
    setBusy(true);
    try {
      // Older development builds can still open the app while Google is disabled, without this native module.
      const {GoogleOneTapSignIn, isSuccessResponse, isCancelledResponse} = await import('react-native-nitro-google-signin');
      const {nonce} = await request<{nonce: string}>('/api/v1/auth/google/challenge', {method: 'POST'});
      GoogleOneTapSignIn.configure({webClientId: config.webClientId!, iosClientId: config.iosClientId, offlineAccess: false, nonce});
      if (Platform.OS === 'android') await GoogleOneTapSignIn.checkPlayServices();
      const response = await GoogleOneTapSignIn.presentExplicitSignIn();
      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response)) throw new Error('Google no pudo completar el acceso. Inténtalo otra vez.');
      const session = await request<SessionResponse>('/api/v1/auth/google', {method: 'POST', token: useAuth.getState().session?.token,
        body: {idToken: response.data.idToken, nonce}});
      await useAuth.getState().setSession(session); onSession(session);
    } catch (error) {onError(error instanceof Error && !error.message.includes('idToken') ? error.message : 'No se pudo entrar con Google.');}
    finally {setBusy(false);}
  };
  return <View style={{gap: 6}}><Button title={busy ? 'Entrando con Google…' : 'Continuar con Google'} secondary icon="logo-google" disabled={!enabled || busy} onPress={() => void login()}/>
    {!enabled && <Muted style={{fontSize: 11, textAlign: 'center'}}>{provider.isPending ? 'Comprobando opciones de acceso…' : 'Google estará disponible pronto. Puedes usar tu correo.'}</Muted>}
  </View>;
}
