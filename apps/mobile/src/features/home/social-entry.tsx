import {gradientStyle} from '../../theme';
import {View} from 'react-native';
import {router} from 'expo-router';
import {Ionicons} from '../../icons';
import {Button, Card, Label, Muted} from '../../ui';
export function SocialEntry() {
  return <Card style={{padding: 22, ...gradientStyle('linear-gradient(135deg, #14294B 0%, #24183E 70%, #141B2A 100%)', "#14294B"), overflow: 'hidden'}}><View style={{position: 'absolute', right: -16, top: -24, width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: '#8872BA40'}}/><Label style={{fontSize: 10, fontWeight: '900', letterSpacing: 2, color: '#7DE2EF'}}>VER. ESCUCHAR. COMPARTIR.</Label><View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}><View style={{flex: 1}}><Label style={{fontSize: 27, lineHeight: 32, fontWeight: '900', color: '#FFFFFF'}}>Un buen momento{ '\n'}suena mejor juntos.</Label><Muted style={{color: '#BCC6DC', paddingTop: 7}}>Radio, música y video con tu gente.</Muted></View><Ionicons name="play-circle-outline" size={45} color="#93BDF0"/></View><View style={{flexDirection: 'row', gap: 8}}><View style={{flex: 1}}><Button title="Crear sala" icon="add" onPress={() => router.push('/create-room')}/></View><View style={{flex: 1}}><Button title="Explorar" secondary icon="people-outline" onPress={() => router.push('/rooms')}/></View></View><Button title="Descubre con ONDA AI" icon="sparkles-outline" secondary onPress={() => router.push('/assistant')}/></Card>;
}
