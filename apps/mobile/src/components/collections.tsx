import {useState} from 'react';
import {Keyboard, Pressable, TextInput, View} from 'react-native';
import {Ionicons} from '../icons';
import {useTheme} from '../theme';
import {useLibrary} from '../library';
import type {Station} from '../types';
import {Label, Muted} from './primitives';
import {Artwork} from './artwork';
import {Button} from './controls';
import {Sheet} from './sheets';

export function CollectionPicker({station, onClose}: {station: Station; onClose: () => void}) {
  const c = useTheme();
  const collections = useLibrary(s => s.collections);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const create = () => {
    const id = useLibrary.getState().createCollection(name);
    if (!id) {setError('Escribe un nombre para tu colección.'); return;}
    useLibrary.getState().addToCollection(id, station);
    Keyboard.dismiss(); onClose();
  };
  return <Sheet title="Guardar en colección" onClose={onClose}>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6}}><Artwork station={station} size={44}/><Label numberOfLines={2} style={{flex: 1, fontWeight: '700'}}>{station.name}</Label></View>
    {collections.length === 0 && <Muted style={{fontSize: 14}}>Crea tu primera colección para reunir las radios de cada momento.</Muted>}
    {collections.map(collection => {
      const saved = collection.stations.some(s => s.id === station.id);
      return <Pressable key={collection.id} accessibilityRole="checkbox" accessibilityState={{checked: saved}} accessibilityLabel={collection.name} onPress={() => {
        const library = useLibrary.getState();
        if (saved) library.removeFromCollection(collection.id, station.id);
        else library.addToCollection(collection.id, station);
      }} style={{minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: c.surface, borderRadius: 16, marginBottom: 6}}>
        <Ionicons name="albums-outline" size={22} color={c.primaryText}/><View style={{flex: 1}}><Label style={{fontWeight: '700'}}>{collection.name}</Label><Muted>{collection.stations.length} {collection.stations.length === 1 ? 'emisora' : 'emisoras'}</Muted></View><Ionicons name={saved ? 'checkbox' : 'square-outline'} size={24} color={saved ? c.primary : c.muted}/>
      </Pressable>;
    })}
    <Label style={{fontWeight: '700', marginTop: 6}}>Nueva colección</Label>
    <TextInput accessibilityLabel="Nombre de la colección" placeholder="Por ejemplo, Música para trabajar" placeholderTextColor={c.muted} value={name} maxLength={50} onChangeText={value => {setName(value); setError('');}} onSubmitEditing={create} returnKeyType="done" style={{minHeight: 50, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, color: c.text, backgroundColor: c.surface}}/>
    {error ? <Label accessibilityLiveRegion="polite" style={{color: c.live, fontSize: 13}}>{error}</Label> : null}
    <View style={{gap: 8, marginTop: 4}}><Button title="Crear y guardar emisora" onPress={create}/><Button title="Listo" secondary onPress={onClose}/></View>
  </Sheet>;
}
