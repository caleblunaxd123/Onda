import {useState} from 'react';
import {Keyboard, Pressable, View} from 'react-native';
import {router} from 'expo-router';
import {request} from '../src/api';
import {useTheme} from '../src/theme';
import {useLibrary} from '../src/library';
import {Ionicons} from '../src/icons';
import {Button, Card, Chip, Label, Muted, Page, ScreenHeader, Sheet} from '../src/ui';
import {FormField} from '../src/components/forms';
import {accountRequest, signOut, useAuth, type Listener, type SessionResponse} from '../src/features/account/session';
import {syncLibrary, useCloudSync} from '../src/features/account/cloud-sync';
import {GoogleLoginButton} from '../src/features/account/google';
import {OndaAmbientBackground, OndaMotionCard} from '../src/components/experience';
import {useModerationAccess} from '../src/features/account/moderation';
import {Avatar} from '../src/features/rooms/presentation';
import {verificationMessage} from '../src/features/account/email-verification';

export default function AccountScreen() {
  const c = useTheme(); const auth = useAuth(); const library = useLibrary(); const cloud = useCloudSync();
  const user = auth.session?.user;
  const moderation = useModerationAccess();
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [name, setName] = useState(user?.displayName ?? ''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState('');
  const verifyEmail = async () => {
    setBusy(true); setVerificationInfo('');
    try {const result = await accountRequest<{status: string}>('/api/v1/auth/email/request', {method: 'POST'}); setVerificationInfo(verificationMessage(result.status));}
    catch (e) {setVerificationInfo(e instanceof Error ? e.message : 'No se pudo enviar.');} finally {setBusy(false);}
  };
  const rename = async () => {
    setBusy(true); setError('');
    try {const updated = await accountRequest<Listener>('/api/v1/auth/profile', {method: 'PATCH', body: {displayName: name}}); if (auth.session) await auth.setSession({...auth.session, user: updated}); setEditingName(false);}
    catch (e) {setError(e instanceof Error ? e.message : 'No se pudo cambiar el nombre.');} finally {setBusy(false);}
  };
  const submit = async () => {
    setBusy(true); setError(''); Keyboard.dismiss();
    try {
      const session = await request<SessionResponse>(`/api/v1/auth/${mode}`, {method: 'POST', token: mode === 'register' ? auth.session?.token : undefined,
        body: mode === 'register' ? {displayName: name, email, password} : mode === 'recover' ? {email, password, code: code.replace(/\s/g, '')} : {email, password}});
      await auth.setSession(session); setPassword(''); setCode(''); router.replace('/');
    } catch (e) {setError(e instanceof Error ? e.message : 'No se pudo completar. Intenta otra vez.');}
    finally {setBusy(false);}
  };
  const logout = async () => {
    setBusy(true); setError('');
    try {await signOut();} catch (e) {setError(e instanceof Error ? e.message : 'No se pudo cerrar la sesión.');} finally {setBusy(false);}
  };
  const remove = async () => {
    setBusy(true); setError('');
    try {await accountRequest<void>('/api/v1/auth/account', {method: 'DELETE', body: {password}}); await auth.setSession(null); library.configureSync(null); setPassword(''); setDeleting(false);}
    catch (e) {setError(e instanceof Error ? e.message : 'No se pudo eliminar la cuenta.');} finally {setBusy(false);}
  };
  const enabled = !!user && library.syncAccountId === user.id;
  return <View style={{flex: 1}}>
    <OndaAmbientBackground/>
    <ScreenHeader title="Tu cuenta" back/>
    <Page>
      {(!user || user.guest) && <OndaMotionCard><View style={{gap: 6, paddingHorizontal: 4, paddingBottom: 4}}><Label style={{fontSize: 28, lineHeight: 35, fontWeight: '800'}}>Mira, escucha y comparte.</Label><Muted>Tu gente y tus favoritos, en un solo lugar.</Muted></View></OndaMotionCard>}
      <Card>
        <View style={{flexDirection: 'row', gap: 14, alignItems: 'center'}}><Avatar size={56} member={{id: user?.id ?? 'onboarding', name: user?.displayName ?? 'ONDA', avatarUrl: user?.avatarUrl}}/><View style={{flex: 1}}><Label style={{fontSize: 21, fontWeight: '800'}}>{user?.displayName ?? 'Tu mundo, contigo'}</Label><Muted>{user?.email ?? 'Puedes entrar a las salas como invitado.'}</Muted></View></View>
        {user?.guest && <Muted>Conserva tu identidad de invitado al crear una cuenta. Tu contraseña y biblioteca estarán protegidas en ONDA.</Muted>}
        {user && <Button title="Cambiar cómo me ven" secondary onPress={() => {setName(user.displayName); setEditingName(true); setError('');}}/>}
      </Card>
      {(!user || user.guest) ? <>
        <GoogleLoginButton onSession={() => router.replace('/')} onError={setError}/>
        <View style={{flexDirection: 'row', gap: 8}}><Chip label="Iniciar sesión" selected={mode === 'login'} onPress={() => {setMode('login'); setError('');}}/><Chip label="Crear cuenta" selected={mode === 'register'} onPress={() => {setMode('register'); setError('');}}/></View>
        {mode === 'register' && <FormField label="Tu nombre" value={name} onChange={setName} placeholder="Cómo te verán en las salas" maxLength={40}/>}
        <FormField label="Correo electrónico" value={email} onChange={setEmail} keyboardType="email-address" placeholder="tu@correo.com" maxLength={254}/>
        {mode === 'recover' && <><Muted>Usa el código privado que recibiste al crear tu cuenta. Al recuperar, se cerrarán las sesiones anteriores y recibirás un código nuevo.</Muted><FormField label="Código de recuperación" value={code} onChange={setCode} maxLength={80}/></>}
        <FormField label={mode === 'recover' ? 'Nueva contraseña' : 'Contraseña'} value={password} onChange={setPassword} secure placeholder="Al menos 10 caracteres"/>
        {error && <Label accessibilityRole="alert" style={{color: c.live}}>{error}</Label>}
        <Button title={busy ? 'Un momento…' : mode === 'register' ? 'Crear mi cuenta' : mode === 'recover' ? 'Recuperar cuenta' : 'Entrar'} onPress={() => void submit()} disabled={busy || !email.trim() || password.length < 10 || mode === 'register' && name.trim().length < 2 || mode === 'recover' && code.replace(/\s/g, '').length !== 64}/>
        <Pressable accessibilityRole="button" onPress={() => {setMode(mode === 'recover' ? 'login' : 'recover'); setError('');}} style={{minHeight: 44, justifyContent: 'center'}}><Label style={{color: c.primaryText, textAlign: 'center'}}>{mode === 'recover' ? 'Volver a iniciar sesión' : 'Tengo un código de recuperación'}</Label></Pressable>
        <Muted>El correo identifica tu cuenta. Guarda tu código privado para recuperarla. El envío de verificación depende de la disponibilidad del servicio de correo.</Muted>
      </> : <>
        {user.provider !== 'google' && <GoogleLoginButton onSession={() => router.replace('/')} onError={setError}/>}
        {user.provider === 'google' && <Muted>Cuenta conectada con Google.</Muted>}
        {user.provider !== 'google' && <Card><Label style={{fontWeight: '800'}}>{user.emailVerified ? 'Correo confirmado' : 'Confirma tu correo'}</Label>
          {!user.emailVerified && <><Muted>Confirma que este correo es tuyo. El enlace vence en 30 minutos.</Muted><Button title={busy ? 'Un momento…' : 'Enviar enlace de verificación'} secondary disabled={busy} onPress={() => void verifyEmail()}/></>}
          {verificationInfo && <Muted accessibilityRole="alert">{verificationInfo}</Muted>}
        </Card>}
        <Card>
          <Label style={{fontWeight: '800', fontSize: 19}}>Tu biblioteca, en todos tus dispositivos</Label>
          <Muted>Al activarla, ONDA combinará radios, videos, música guardada y colecciones. Las nuevas altas y eliminaciones se sincronizan; puedes detenerla cuando quieras.</Muted>
          <Pressable accessibilityRole="checkbox" accessibilityState={{checked: library.syncHistory}} onPress={() => library.configureSync(enabled ? user.id : null, !library.syncHistory)} style={{flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44}}><Ionicons name={library.syncHistory ? 'checkbox' : 'square-outline'} size={23} color={c.primaryText}/><Label>También mi historial de escucha</Label></Pressable>
          <Button title={cloud.busy ? 'Sincronizando…' : enabled ? 'Sincronizar ahora' : 'Activar sincronización'} icon="cloud-upload-outline" disabled={cloud.busy} onPress={() => {library.configureSync(user.id, library.syncHistory); void syncLibrary();}}/>
          {enabled && <Button title="Detener sincronización" secondary onPress={() => library.configureSync(null, library.syncHistory)}/>}
          {cloud.lastSync && <Muted>Última sincronización: {new Date(cloud.lastSync).toLocaleTimeString('es', {hour: '2-digit', minute: '2-digit'})}.</Muted>}
          {cloud.error && <Label accessibilityRole="alert" style={{color: c.live}}>{cloud.error}</Label>}
        </Card>
        {auth.storageError && <Muted>{auth.storageError}</Muted>}
        {error && <Label accessibilityRole="alert" style={{color: c.live}}>{error}</Label>}
        <Button title={busy ? 'Un momento…' : 'Cerrar sesión'} secondary icon="log-out-outline" disabled={busy} onPress={() => void logout()}/>
        <Button title="Eliminar mi cuenta" secondary icon="trash-outline" onPress={() => {setDeleting(true); setPassword(''); setError('');}}/>
      </>}
      <Button title="Leer privacidad y convivencia" secondary icon="shield-checkmark-outline" onPress={() => router.push('/privacy')}/>
      {user && <Button title="Personas bloqueadas" secondary icon="ban-outline" onPress={() => router.push('/safety')}/>}
      {moderation.data?.allowed && <Button title="Revisar reportes" secondary icon="shield-outline" onPress={() => router.push('/moderation')}/>}
      {user?.guest && <Button title="Cerrar mi sesión de invitado" secondary disabled={busy} onPress={() => void logout()}/>}
    </Page>
    {editingName && <Sheet title="Tu nombre en ONDA" onClose={() => setEditingName(false)}><FormField label="Nombre público" value={name} onChange={setName} maxLength={40}/>{error && <Muted accessibilityRole="alert">{error}</Muted>}<Button title={busy ? 'Guardando…' : 'Guardar nombre'} disabled={busy || name.trim().length < 2} onPress={() => void rename()}/></Sheet>}
    {deleting && <Sheet title="Eliminar cuenta" onClose={() => {setDeleting(false); setPassword('');}}>
      <Muted>Se eliminarán tu cuenta, sesiones, biblioteca de la nube y salas creadas. Tu biblioteca de este dispositivo permanece. Las copias cifradas vencen a los 14 días.</Muted>
      <FormField label={user?.provider === 'google' ? 'Contraseña o código de recuperación' : 'Confirma tu contraseña'} value={password} onChange={setPassword} secure/>
      {error && <Label accessibilityRole="alert" style={{color: c.live}}>{error}</Label>}
      <Button title={busy ? 'Eliminando…' : 'Eliminar cuenta definitivamente'} disabled={busy || password.length < 10} onPress={() => void remove()}/>
    </Sheet>}
  </View>;
}
