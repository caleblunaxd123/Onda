import {useState} from 'react';
import {quickAccessAvailable, requestQuickWidget} from './quick-access';
import {Button, Card, Label, Muted} from './ui';
export function QuickAccessCard() {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  if (!quickAccessAvailable) return null;
  return <Card><Label style={{fontWeight: '800', fontSize: 17}}>Tus radios, a un toque</Label>
    <Muted>Añade el widget ONDA a tu pantalla de inicio. Muestra tus tres primeras favoritas; toca una para abrir ONDA y escuchar. También aparecen al mantener pulsado el icono de la app.</Muted>
    <Button title="Añadir widget de favoritas" icon="grid-outline" disabled={busy} onPress={() => {setBusy(true); void requestQuickWidget().then(requested => setMessage(requested ? 'Confirma «Añadir» en tu pantalla de inicio. También puedes buscar ONDA en los widgets de tu celular.' : 'Mantén pulsada una zona vacía de tu pantalla de inicio, elige Widgets y busca ONDA.')).catch(() => setMessage('Añádelo desde la lista de Widgets de tu pantalla de inicio.')).finally(() => setBusy(false));}}/>
    {message ? <Muted accessibilityLiveRegion="polite">{message}</Muted> : null}
  </Card>;
}
