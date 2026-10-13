import {View} from 'react-native';
import {router} from 'expo-router';
import {useTheme} from '../../theme';
import {Ionicons} from '../../icons';
import {Button, Card, Label, Muted} from '../../ui';
export function SocialEntry() {
  const c = useTheme();
  return <Card style={{backgroundColor: c.accentSoft, padding: 18}}><View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}><Ionicons name="people" size={28} color={c.accent}/><View style={{flex: 1}}><Label style={{fontSize: 20, fontWeight: '900'}}>Los buenos momentos se comparten.</Label><Muted>Radio, música y video. Una sala para tu gente.</Muted></View></View><View style={{flexDirection: 'row', gap: 8}}><View style={{flex: 1}}><Button title="Crear sala" icon="add" onPress={() => router.push('/create-room')}/></View><View style={{flex: 1}}><Button title="Explorar" secondary icon="people-outline" onPress={() => router.push('/rooms')}/></View></View><Button title="Descubre con ONDA AI" icon="sparkles-outline" secondary onPress={() => router.push('/assistant')}/></Card>;
}
