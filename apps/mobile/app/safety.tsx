import {useState} from 'react';
import {View} from 'react-native';
import {useBlocks} from '../src/features/account/safety';
import {Button, Card, Label, Loading, Message, Muted, Page, ScreenHeader} from '../src/ui';
import {useAuth} from '../src/features/account/session';

export default function SafetyScreen() {
  const session = useAuth(s => s.session);
  const blocks = useBlocks();
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  return <View style={{flex: 1}}><ScreenHeader title="Personas bloqueadas" back/><Page>
    <Muted>Los bloqueos se guardan en tu cuenta. Ocultan mensajes, reacciones y avisos de escritura. Ninguno puede entrar en salas del otro. En salas de terceras personas pueden seguir coincidiendo.</Muted>
    {!session ? <Muted>Entra con tu cuenta o identidad de invitado para revisar tus bloqueos.</Muted>
      : blocks.isPending ? <Loading label="Cargando personas bloqueadas"/> : blocks.isError ? <Message title="No se pudo cargar tu lista" body="Comprueba tu conexión e inténtalo de nuevo." retry={() => void blocks.refetch()}/>
      : blocks.items.length ? blocks.items.map(person => <Card key={person.id}>
        <Label style={{fontWeight: '800'}}>{person.name}</Label>
        <Button title={busy === person.id ? 'Guardando…' : 'Desbloquear'} secondary disabled={!!busy} onPress={() => {
          setBusy(person.id); setNotice('');
          void blocks.setBlocked(person, false).catch(e => setNotice(e instanceof Error ? e.message : 'No se pudo desbloquear.')).finally(() => setBusy(''));
        }}/>
      </Card>) : <Card><Label style={{fontWeight: '800'}}>No tienes personas bloqueadas.</Label><Muted>Puedes bloquear desde las opciones de una persona en la sala.</Muted></Card>}
    {!!notice && <Label accessibilityRole="alert">{notice}</Label>}
  </Page></View>;
}
