import {useState} from 'react';
import * as Linking from 'expo-linking';
import {router} from 'expo-router';
import {request} from '../src/api';
import {Button, Card, Label, Muted, Page, ScreenHeader} from '../src/ui';
import {accountRequest, type Listener, useAuth} from '../src/features/account/session';
import {verificationToken} from '../src/features/account/email-verification';

export default function VerifyEmailScreen() {
  const url = Linking.useURL();
  const token = verificationToken(url);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('');
  const confirm = async () => {
    setBusy(true); setError('');
    try {
      await request<void>('/api/v1/auth/email/confirm', {method: 'POST', body: {token}}); setDone(true);
      const session = useAuth.getState().session;
      if (session) {
        try {const user = await accountRequest<Listener>('/api/v1/auth/me'); await useAuth.getState().setSession({...session, user});}
        catch {/* Confirmation succeeds even if the local session expired. */}
      }
    } catch (e) {setError(e instanceof Error ? e.message : 'No se pudo confirmar tu correo.');}
    finally {setBusy(false);}
  };
  return <><ScreenHeader title="Confirma tu correo" back/><Page><Card>
    <Label style={{fontSize: 24, fontWeight: '800'}}>{done ? 'Correo confirmado' : 'Tu cuenta, protegida'}</Label>
    <Muted>{done ? 'Ya puedes volver a ONDA.' : token ? 'Pulsa para confirmar que este correo te pertenece.' : 'Abre el enlace que recibiste por correo. Si venció, pide uno nuevo desde Tu cuenta.'}</Muted>
    {error && <Muted accessibilityRole="alert">{error}</Muted>}
    {!done && token && <Button title={busy ? 'Confirmando…' : 'Confirmar mi correo'} disabled={busy} onPress={() => void confirm()}/>}
    <Button title={done ? 'Ir al inicio' : 'Ir a mi cuenta'} secondary onPress={() => router.replace(done ? '/' : '/account')}/>
  </Card></Page></>;
}
