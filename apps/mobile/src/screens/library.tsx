import { useState } from 'react';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { uniqueBroadcasts, useLibrary } from '../library';
import { useTheme } from '../theme';
import { Ionicons } from '../icons';
import { Page, Heading, Label, Button, StationRow, Artwork, Card, IconButton, SectionTitle, BrandHeader, cardStyle } from '../ui';

type Section = 'favorites' | 'history' | 'collections';
const sections = [{id: 'favorites', label: 'Favoritos'}, {id: 'history', label: 'Historial'}, {id: 'collections', label: 'Colecciones'}] as const;

export default function Library() {
  const c = useTheme();
  const library = useLibrary();
  const [section, setSection] = useState<Section>('favorites');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const selected = section === 'collections' ? library.collections.find(item => item.id === selectedId) : undefined;
  const source = selected?.stations ?? (section === 'collections' ? [] : section === 'history' ? uniqueBroadcasts(library.history) : library[section]);
  const needle = query.trim().toLocaleLowerCase();
  const rows = source.filter(s => [s.name, s.country, ...s.tags].join(' ').toLocaleLowerCase().includes(needle));
  const collections = library.collections.filter(item => item.name.toLocaleLowerCase().includes(needle));
  const inputStyle = {minHeight: 50, padding: 14, borderRadius: 14, backgroundColor: c.surface, color: c.text, borderWidth: 1, borderColor: c.border};
  const edit = () => {setName(selected?.name ?? ''); setError(''); setEditing(true); setDeleting(false);};
  const save = () => {
    if (selected) {
      if (!library.renameCollection(selected.id, name)) {setError('Escribe un nombre para tu colección.'); return;}
    } else {
      const id = library.createCollection(name);
      if (!id) {setError('Escribe un nombre para tu colección.'); return;}
      setSelectedId(id);
    }
    Keyboard.dismiss(); setEditing(false); setQuery('');
  };
  return <View style={{flex: 1, backgroundColor: 'transparent'}}>
    <BrandHeader title="Tu biblioteca" emoji="💜" subtitle="Las radios que hacen tu día."><IconButton icon="add" label="Crear colección" onPress={() => {setSection('collections'); setSelectedId(null); setName(''); setError(''); setEditing(true); setDeleting(false);}}/><IconButton icon="download-outline" label="Respaldo de favoritas" onPress={() => router.push('/backup')}/><IconButton icon="settings-outline" label="Ajustes" onPress={() => router.push('/settings')}/></BrandHeader>
    <Page>
    <View accessibilityRole="tablist" style={{flexDirection: 'row', padding: 4, borderRadius: 99, backgroundColor: c.surface, gap: 4, borderWidth: 1, borderColor: c.border, marginTop: -6}}>
      {sections.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected: section === item.id}} onPress={() => {setSection(item.id); setSelectedId(null); setQuery(''); setEditing(false); setDeleting(false);}} style={{flex: 1, minHeight: 44, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: section === item.id ? c.primary : 'transparent'}}><Label style={{fontSize: 12, fontWeight: '700', color: section === item.id ? c.onPrimary : c.muted}}>{item.label}</Label></Pressable>)}
    </View>
    {selected && <View style={{gap: 12}}>
      <Pressable accessibilityRole="button" onPress={() => {setSelectedId(null); setQuery(''); setEditing(false); setDeleting(false);}} style={{flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44}}><Ionicons name="chevron-back" size={20} color={c.primary}/><Label style={{color: c.primary, fontSize: 14}}>Todas las colecciones</Label></Pressable>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><View style={{flex: 1}}><Heading>{selected.name}</Heading><Label style={{fontSize: 13, color: c.muted}}>{selected.stations.length} {selected.stations.length === 1 ? 'emisora' : 'emisoras'} · Tu selección</Label></View><IconButton icon="pencil-outline" label="Renombrar colección" onPress={edit}/><IconButton icon="trash-outline" label="Eliminar colección" onPress={() => {setDeleting(true); setEditing(false);}}/></View>
    </View>}
    {editing && <Card><Label style={{fontWeight: '800'}}>{selected ? 'Renombrar colección' : 'Crea una colección'}</Label><TextInput autoFocus accessibilityLabel="Nombre de la colección" placeholder="Viajes, noches de jazz, mis favoritas…" placeholderTextColor={c.muted} maxLength={50} value={name} onChangeText={value => {setName(value); setError('');}} onSubmitEditing={save} returnKeyType="done" style={inputStyle}/>{error ? <Label accessibilityLiveRegion="polite" style={{color: c.live, fontSize: 13}}>{error}</Label> : null}<View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}><Button title={selected ? 'Guardar nombre' : 'Crear colección'} onPress={save}/><Button title="Cancelar" secondary onPress={() => setEditing(false)}/></View></Card>}
    {deleting && selected && <Card><Label style={{fontWeight: '800'}}>¿Eliminar «{selected.name}»?</Label><Label style={{fontSize: 14, color: c.muted}}>Se elimina la colección de este dispositivo. Tus favoritos e historial se conservan.</Label><View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}><Button title="Eliminar colección" onPress={() => {library.deleteCollection(selected.id); setSelectedId(null); setDeleting(false); setQuery('');}}/><Button title="Cancelar" secondary onPress={() => setDeleting(false)}/></View></Card>}
    {(source.length > 0 || (section === 'collections' && !selected && library.collections.length > 0)) && <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: c.surface, paddingHorizontal: 14}}><Ionicons name="search" size={18} color={c.muted}/><TextInput accessibilityLabel="Buscar en tu biblioteca" placeholder="Buscar en tu biblioteca" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} style={{flex: 1, minHeight: 48, color: c.text}}/>{query ? <IconButton icon="close" label="Limpiar búsqueda" onPress={() => setQuery('')}/> : null}</View>}
    {section === 'collections' && !selected ? <>
      <SectionTitle title={`${library.collections.length} ${library.collections.length === 1 ? 'colección' : 'colecciones'}`} action="Nueva" onPress={edit}/>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>{collections.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Abrir colección '+item.name} onPress={() => {setSelectedId(item.id); setQuery(''); setEditing(false); setDeleting(false);}} style={[cardStyle(c), {width: '47%', flexGrow: 1, padding: 14, gap: 10}]}>
        <View style={{height: 100, borderRadius: 16, backgroundColor: (index % 2 ? c.accent : c.primary)+'18', alignItems: 'center', justifyContent: 'center'}}>{item.stations.length ? <Artwork station={item.stations[0]} size={76}/> : <Ionicons name="albums-outline" size={42} color={index % 2 ? c.accent : c.primary}/>}</View><View><Label numberOfLines={2} style={{fontWeight: '800'}}>{item.name}</Label><Label style={{fontSize: 12, color: c.muted}}>{item.stations.length} {item.stations.length === 1 ? 'emisora' : 'emisoras'}</Label></View>
      </Pressable>)}</View>
      {collections.length === 0 && <Empty icon="albums-outline" title={needle ? 'No hay coincidencias' : 'Una colección para cada momento'} body={needle ? 'Prueba con otro nombre.' : 'Agrupa tus emisoras para trabajar, viajar o desconectar.'}>{!needle && <Button title="Crear mi primera colección" onPress={edit}/>}</Empty>}
    </> : <>
      {rows.length > 0 && <SectionTitle title={`${rows.length} ${rows.length === 1 ? 'emisora' : 'emisoras'}`}/>}
      <View style={{gap: 4}}>{rows.map(station => <StationRow key={station.id} station={station} onRemove={selected ? () => library.removeFromCollection(selected.id, station.id) : undefined}/>)}</View>
      {rows.length === 0 && <Empty icon={section === 'history' ? 'time-outline' : section === 'favorites' ? 'heart-outline' : 'albums-outline'} title={needle ? 'No hay coincidencias' : selected ? 'Dale sonido a tu colección' : section === 'favorites' ? 'Aquí viven tus favoritas' : 'Tu viaje empieza con una radio'} body={needle ? 'Prueba con otra emisora, país o género.' : selected ? 'Usa el botón + de cualquier emisora para guardarla en esta colección.' : section === 'favorites' ? 'Toca el corazón de una emisora y vuelve a encontrarla aquí.' : 'Las emisoras aparecen cuando comienza su reproducción.'}>{!needle && <Button title="Descubrir emisoras" onPress={() => router.push('/search')}/>}</Empty>}
    </>}
    <View style={{flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', paddingTop: 12}}><Ionicons name="phone-portrait-outline" size={14} color={c.muted}/><Label style={{color: c.muted, fontSize: 11}}>Guardado en este dispositivo · Modo invitado</Label></View>
    </Page>
  </View>;
}

function Empty({icon, title, body, children}: {icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string; children?: React.ReactNode}) {
  const c = useTheme();
  return <View style={{alignItems: 'center', paddingVertical: 28, gap: 16}}><View style={{backgroundColor: c.primary+'15', padding: 24, borderRadius: 99}}><Ionicons name={icon} size={36} color={c.primary}/></View><Label style={{fontSize: 20, fontWeight: '800', textAlign: 'center'}}>{title}</Label><Label style={{fontSize: 14, color: c.muted, textAlign: 'center', maxWidth: 290}}>{body}</Label>{children}</View>;
}
