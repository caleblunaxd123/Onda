import {useState} from 'react';
import {View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {Button, Card, Chip, Label, Loading, Message, Muted, Page, ScreenHeader, Sheet} from '../src/ui';
import {FormField} from '../src/components/forms';
import {accountRequest, useAuth} from '../src/features/account/session';
import {useModerationAccess} from '../src/features/account/moderation';
type Report = {id: number; roomId: string; accountId: string | null; messageId: string | null; messageSnapshot: string | null; reason: string; createdAt: string};
const actions = {'dismiss': 'Descartar reporte', 'delete-message': 'Eliminar mensaje', 'close-room': 'Cerrar sala'} as const;
export default function ModerationScreen() {
  const session = useAuth(s => s.session);
  const access = useModerationAccess();
  const reports = useQuery({queryKey: ['moderation-reports', session?.user.id], enabled: !!access.data?.allowed, retry: false,
    queryFn: () => accountRequest<{items: Report[]}>('/api/v1/moderation/reports')});
  const [selected, setSelected] = useState<Report | null>(null);
  const [action, setAction] = useState<keyof typeof actions>('dismiss');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <View style={{flex: 1}}><ScreenHeader title="Moderación" back/><Page>
    {!session || session.user.guest ? <Muted>Se necesita una cuenta autorizada por el administrador.</Muted>
      : access.isPending ? <Loading label="Comprobando acceso"/> : !access.data?.allowed ? <Message title="Acceso restringido" body="Esta cuenta no tiene permiso para revisar reportes."/>
      : reports.isPending ? <Loading label="Cargando reportes"/> : reports.isError ? <Message title="No se pudieron cargar los reportes" body="Inténtalo de nuevo." retry={() => void reports.refetch()}/>
      : <>
        <Muted>Hasta 50 reportes pendientes, del más antiguo al más reciente. Los datos de revisión son privados.</Muted>
        {!reports.data?.items.length && <Card><Label>No hay reportes pendientes.</Label></Card>}
        {reports.data?.items.map(report => <Card key={report.id}>
          <Label style={{fontWeight: '800'}}>Reporte #{report.id} · {report.messageId ? 'Mensaje' : report.accountId ? 'Persona' : 'Sala'}</Label>
          <Muted>{new Date(report.createdAt).toLocaleString('es-PE')}</Muted><Label>{report.reason}</Label>
          <Button title="Revisar" secondary onPress={() => {setSelected(report); setAction('dismiss'); setNote(''); setError('');}}/>
        </Card>)}
      </>}
  </Page>
  {selected && <Sheet title={'Revisar reporte #' + selected.id} onClose={() => {if (!busy) setSelected(null);}}>
    <Label>{selected.reason}</Label>
    {!!selected.messageSnapshot && <Card><Muted>Texto enviado con el reporte</Muted><Label selectable>{selected.messageSnapshot}</Label></Card>}
    <View style={{gap: 8}}>{(Object.keys(actions) as (keyof typeof actions)[]).filter(value => value !== 'delete-message' || selected.messageId).map(value =>
      <Chip key={value} label={actions[value]} selected={action === value} onPress={() => setAction(value)}/>)}</View>
    <Muted>{action === 'close-room' ? 'La sala se cerrará para todos.' : action === 'delete-message' ? 'El mensaje se eliminará para todos. El texto reportado seguirá en la revisión hasta su vencimiento.' : 'El reporte se cerrará sin cambiar la sala ni el mensaje.'}</Muted>
    <FormField label="Motivo de la decisión" value={note} onChange={setNote} multiline maxLength={500}/>
    {!!error && <Label accessibilityRole="alert">{error}</Label>}
    <Button title={busy ? 'Guardando…' : actions[action]} disabled={busy || note.trim().length < 3} onPress={() => {
      setBusy(true); setError('');
      void accountRequest('/api/v1/moderation/reports/' + selected.id + '/review', {method: 'POST', body: {action, note}})
        .then(() => {setSelected(null); void reports.refetch();})
        .catch(e => setError(e instanceof Error ? e.message : 'No se pudo completar la revisión.'))
        .finally(() => setBusy(false));
    }}/>
  </Sheet>}
  </View>;
}
