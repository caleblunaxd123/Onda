import {Button, Label, Muted, Sheet} from '../../ui';
import {useAuth} from './session';
import {verificationMessage} from './email-verification';

/** One-time code stays in memory above navigation; never enters persisted session data or a URL. */
export function RecoveryCodeNotice() {
  const code = useAuth(state => state.recoveryCode);
  const clear = useAuth(state => state.clearRecoveryCode);
  const user = useAuth(state => state.session?.user);
  const verification = useAuth(state => state.emailVerificationStatus);
  if (!code) return null;
  return <Sheet title="Guarda tu código privado" onClose={() => {}}>
    <Muted>Este código permite recuperar tu cuenta. Guárdalo en tu gestor de contraseñas. ONDA conserva únicamente su huella; no puede mostrártelo de nuevo.</Muted>
    {user?.provider === 'email' && !user.emailVerified && <Muted>{verificationMessage(verification ?? 'unavailable')}</Muted>}
    <Label selectable style={{fontFamily: 'monospace', paddingVertical: 18, fontSize: 14, lineHeight: 22}}>{code.match(/.{1,16}/g)?.join('\n')}</Label>
    <Button title="Ya lo guardé" onPress={clear}/>
  </Sheet>;
}
