import { View } from 'react-native';
import { useTheme } from '../../src/theme';
import { EmptyState, Muted, Page, ScreenHeader } from '../../src/ui';

/** Social rooms follow the roadmap: they start only after the MVP (playback, map, radar) is accepted. */
export default function Rooms() {
  const c = useTheme();
  return <View style={{flex: 1, backgroundColor: c.bg}}>
    <ScreenHeader title="Salas" subtitle="Escuchar con otras personas"/>
    <Page>
      <EmptyState icon="people-outline" title="Las salas llegarán más adelante" body="Estamos terminando primero la reproducción, el mapa y el radar. Las salas no están activas todavía: aquí no hay personas ni conversaciones simuladas."/>
      <Muted style={{textAlign: 'center'}}>Mientras tanto, comparte una emisora desde su menú ⋮.</Muted>
    </Page>
  </View>;
}
