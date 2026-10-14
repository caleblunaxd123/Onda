import {Pressable, View} from 'react-native';
import {Ionicons} from '../../icons';
import {useTheme} from '../../theme';
import type {Collection} from '../../library';
import {Artwork} from '../../components/artwork';
import {Label, Muted, cardStyle} from '../../components/primitives';
import {collectionDescription} from './selectors';

export function CollectionCard({collection, onPress, index}: {collection: Collection; onPress: () => void; index: number}) {
  const c = useTheme(); const tint = index % 2 ? c.accent : c.primaryText;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir colección ${collection.name}, ${collection.stations.length} emisoras`} onPress={onPress}
    style={({pressed}) => [cardStyle(c), {flex: 1, padding: 12, gap: 10, opacity: pressed ? .7 : 1}]}>
    <View style={{height: 116, borderRadius: 16, backgroundColor: tint+'14', alignItems: 'center', justifyContent: 'center'}}>
      {collection.stations.length ? <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: 94, justifyContent: 'center'}}>{collection.stations.slice(0, 4).map(station => <Artwork key={station.id} station={station} size={44}/>)}</View>
        : <Ionicons name="albums-outline" size={42} color={tint}/>}
      <View style={{position: 'absolute', right: 8, bottom: 8, borderRadius: 99, backgroundColor: c.surface, paddingHorizontal: 8, paddingVertical: 2}}><Label style={{fontSize: 11, fontWeight: '800', color: tint}}>{collection.stations.length}</Label></View>
    </View>
    <Label numberOfLines={2} style={{fontWeight: '800'}}>{collection.name}</Label>
    <Muted numberOfLines={1} style={{fontSize: 11}}>{collectionDescription(collection.stations)}</Muted>
  </Pressable>;
}
