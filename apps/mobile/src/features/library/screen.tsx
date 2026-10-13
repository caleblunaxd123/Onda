import {useMemo, useState} from 'react';
import {FlatList, Keyboard, Pressable, TextInput, View} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {uniqueBroadcasts, useLibrary} from '../../library';
import {mediaLabel} from '../rooms/types';
import {useTheme} from '../../theme';
import {player} from '../../player';
import {Ionicons} from '../../icons';
import {matchesText, flag} from '../../format';
import {BrandHeader, SectionTitle} from '../../components/headers';
import {Button, Chip, IconButton, SearchField} from '../../components/controls';
import {Label, Muted} from '../../components/primitives';
import {EmptyState} from '../../components/feedback';
import {StationRow} from '../../components/stations';
import {ActionRow} from '../../components/station-actions';
import {OptionPicker, Sheet} from '../../components/sheets';
import {CollectionCard} from './collection-card';
import {LibraryOverview} from './overview';
import {useAuth} from '../account/session';
import {libraryCountries, libraryStations, sortLabels, type LibrarySort} from './selectors';

type Section = 'favorites' | 'history' | 'collections' | 'multimedia';
const sections = [{id: 'favorites', label: 'Radios'}, {id: 'multimedia', label: 'Multimedia'}, {id: 'history', label: 'Historial'}, {id: 'collections', label: 'Colecciones'}] as const;

/** Route params select a section without effects that overwrite the person's tab choice. */
export default function LibraryScreen() {
  const params = useLocalSearchParams<{section?: string}>();
  const initial = params.section === 'history' || params.section === 'collections' || params.section === 'multimedia' ? params.section : 'favorites';
  return <LibraryContent key={initial} initial={initial}/>;
}

function LibraryContent({initial}: {initial: Section}) {
  const c = useTheme(); const library = useLibrary();
  const accountId = useAuth(s => s.session?.user.id);
  const [section, setSection] = useState<Section>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState(''); const [country, setCountry] = useState('');
  const [sheet, setSheet] = useState<'country' | 'sort' | 'edit' | 'delete' | null>(null);
  const [name, setName] = useState(''); const [error, setError] = useState('');
  const selected = section === 'collections' ? library.collections.find(item => item.id === selectedId) : undefined;
  const history = useMemo(() => uniqueBroadcasts(library.history), [library.history]);
  const source = useMemo(() => selected?.stations ?? (section === 'favorites' ? library.favorites : section === 'history' ? history : []), [selected, section, library.favorites, history]);
  const countries = useMemo(() => libraryCountries(source), [source]);
  const rows = useMemo(() => libraryStations(source, query, country, library.librarySort), [source, query, country, library.librarySort]);
  const collections = library.collections.filter(item => matchesText(item.name, query));
  const queueTitle = selected?.name ?? (section === 'history' ? 'Historial' : 'Favoritos');
  const queue = {stations: rows, title: queueTitle};
  const isGrid = section === 'collections' && !selected;
  const isMedia = section === 'multimedia';
  const media = library.mediaFavorites.filter(item => matchesText(item.media.title + ' ' + mediaLabel[item.media.kind], query));
  const activeCountry = countries.find(item => item.value === country)?.label ?? country;
  const savedCountries = new Set([...library.favorites, ...history, ...library.collections.flatMap(item => item.stations)].map(item => item.countryCode).filter(Boolean)).size;

  const resetFilters = () => {setQuery(''); setCountry('');};
  const chooseSection = (next: Section) => {setSection(next); setSelectedId(null); resetFilters();};
  const create = () => {chooseSection('collections'); setName(''); setError(''); setSheet('edit');};
  const edit = () => {setName(selected?.name ?? ''); setError(''); setSheet('edit');};
  const save = () => {
    const id = selected ? (library.renameCollection(selected.id, name) ? selected.id : null) : library.createCollection(name);
    if (!id) {setError('Escribe un nombre para tu colección.'); return;}
    setSelectedId(id); setSection('collections'); resetFilters(); Keyboard.dismiss(); setSheet(null);
  };
  const listen = () => {if (rows[0]) {player.select(rows[0], queue); router.push('/player');}};

  const header = <View style={{gap: 16, paddingBottom: 16}}>
    {!selected && <LibraryOverview favorites={library.favorites.length + library.mediaFavorites.length} collections={library.collections.length} countries={savedCountries}/>}
    <View accessibilityRole="tablist" style={{flexDirection: 'row', padding: 4, borderRadius: 99, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border}}>
      {sections.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected: section === item.id}} onPress={() => chooseSection(item.id)}
        style={({pressed}) => ({flex: 1, minHeight: 44, borderRadius: 99, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .7 : 1, backgroundColor: section === item.id ? c.primary : 'transparent'})}>
        <Label style={{fontSize: 12, fontWeight: '700', color: section === item.id ? c.onPrimary : c.muted}}>{item.label}</Label>
      </Pressable>)}
    </View>
    {selected && <View style={{gap: 8}}>
      <Pressable accessibilityRole="button" onPress={() => {setSelectedId(null); resetFilters();}} style={{flexDirection: 'row', gap: 4, alignItems: 'center', minHeight: 44}}><Ionicons name="chevron-back" size={18} color={c.primaryText}/><Label style={{color: c.primaryText, fontSize: 13, fontWeight: '600'}}>Todas las colecciones</Label></Pressable>
      <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}><View style={{flex: 1}}><Label accessibilityRole="header" style={{fontSize: 24, lineHeight: 30, fontWeight: '800'}}>{selected.name}</Label><Muted>{selected.stations.length} {selected.stations.length === 1 ? 'emisora' : 'emisoras'} · Tu selección</Muted></View><IconButton icon="pencil-outline" label="Renombrar colección" onPress={edit}/><IconButton icon="trash-outline" label="Eliminar colección" onPress={() => setSheet('delete')}/></View>
    </View>}
    {(source.length > 0 || library.collections.length > 0 || library.mediaFavorites.length > 0 || query) && <SearchField value={query} onChange={setQuery} placeholder={isGrid ? 'Buscar una colección' : isMedia ? 'Buscar música o video' : 'Emisora, país o género'} label="Buscar en tu biblioteca"/>}
    {!isGrid && source.length > 0 && <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      <Chip label={country ? `${flag(country)} ${activeCountry}` : 'Todos los países'} selected={!!country} icon={country ? undefined : 'earth-outline'} onPress={() => setSheet('country')} onRemove={country ? () => setCountry('') : undefined}/>
      <Chip label={sortLabels[library.librarySort]} icon="swap-vertical-outline" onPress={() => setSheet('sort')}/>
    </View>}
    <SectionTitle title={isMedia ? `${media.length} guardados` : isGrid ? `${collections.length} ${collections.length === 1 ? 'colección' : 'colecciones'}` : `${rows.length} ${rows.length === 1 ? 'emisora' : 'emisoras'}`} action={isGrid ? 'Nueva' : undefined} onPress={create}/>
    {!isGrid && rows.length > 1 && <Button title="Escuchar selección" icon="play" onPress={listen}/>}
  </View>;

  const empty = <EmptyState icon={isGrid ? 'albums-outline' : section === 'history' ? 'time-outline' : 'heart-outline'}
    title={query || country ? 'No hay coincidencias' : isGrid ? 'Una colección para cada momento' : selected ? 'Dale sonido a tu colección' : section === 'history' ? 'Tu viaje empieza con una radio' : 'Aquí viven tus favoritas'}
    body={query || country ? 'Prueba otras palabras o cambia el país.' : isGrid ? 'Reúne tus radios para trabajar, viajar o desconectar.' : selected ? 'Guarda emisoras aquí desde el menú de cualquier radio.' : section === 'history' ? 'Las emisoras aparecen cuando comienza su reproducción.' : 'Toca el corazón de una emisora y vuelve a encontrarla aquí.'}>
    {query || country ? <Button title="Limpiar búsqueda y filtros" secondary onPress={resetFilters}/> : <Button title={isGrid ? 'Crear colección' : 'Descubrir emisoras'} onPress={isGrid ? create : () => router.push('/search')}/>}
  </EmptyState>;
  const footer = <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 28}}><Ionicons name="phone-portrait-outline" size={13} color={c.muted}/><Muted style={{fontSize: 11}}>Guardado en este dispositivo{accountId && library.syncAccountId === accountId ? ' · Sincronización activada' : ' · Biblioteca local'}</Muted></View>;

  return <View style={{flex: 1, backgroundColor: c.bg}}>
    <BrandHeader title="Tu biblioteca" emoji="💜" subtitle="Tus radios, música y videos."><IconButton icon="add" label="Crear colección" onPress={create}/><IconButton icon="settings-outline" label="Ajustes" onPress={() => router.push('/settings')}/></BrandHeader>
    {isMedia ? <FlatList key="media" data={media} keyExtractor={item => item.id} contentContainerStyle={{padding: 20, paddingTop: 8, gap: 12}} keyboardShouldPersistTaps="handled" ListHeaderComponent={header} ListFooterComponent={footer}
      ListEmptyComponent={<EmptyState icon="bookmark-outline" title="Los buenos descubrimientos se guardan" body="En una sala, toca Guardar contenido. Aquí encontrarás tus videos y canciones para volver a disfrutarlos."/>}
      renderItem={({item}) => <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border}}><Pressable accessibilityRole="button" accessibilityLabel={`Reproducir ${item.media.title}`} onPress={() => router.push({pathname: '/watch', params: {id: item.id}})} style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12}}><Ionicons name={item.media.kind === 'audio' || item.media.category === 'music' ? 'musical-notes' : 'videocam'} size={28} color={c.accent}/><View style={{flex: 1}}><Label numberOfLines={2} style={{fontWeight: '800'}}>{item.media.title}</Label><Muted>{item.media.category === 'music' ? 'Música · YouTube' : mediaLabel[item.media.kind]}</Muted></View><Ionicons name="play-circle" size={28} color={c.primaryText}/></Pressable><IconButton icon="bookmark" label="Quitar contenido guardado" onPress={() => library.toggleMedia(item.media)}/></View>}/>
      : isGrid ? <FlatList key="collections" data={collections} numColumns={2} keyExtractor={item => item.id} columnWrapperStyle={{gap: 12}} contentContainerStyle={{padding: 20, paddingTop: 8, gap: 12}} keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header} ListEmptyComponent={empty} ListFooterComponent={footer}
      renderItem={({item, index}) => <View style={{flex: 1, maxWidth: '48.5%'}}><CollectionCard collection={item} index={index} onPress={() => {setSelectedId(item.id); resetFilters();}}/></View>}/>
      : <FlatList key="stations" data={rows} keyExtractor={item => item.id} contentContainerStyle={{paddingHorizontal: 20, paddingTop: 8}} keyboardShouldPersistTaps="handled" initialNumToRender={12} windowSize={7}
        ListHeaderComponent={header} ListEmptyComponent={empty} ListFooterComponent={footer}
        renderItem={({item}) => <StationRow station={item} card queue={queue} onRemove={selected ? () => library.removeFromCollection(selected.id, item.id) : undefined}/>}/>
    }
    {sheet === 'country' && <OptionPicker title="País en tu biblioteca" selected={country} onSelect={setCountry} onClose={() => setSheet(null)}
      options={[{value: '', label: 'Todos los países', leading: '🌐', detail: String(source.length)}, ...countries.map(item => ({value: item.value, label: item.label, leading: flag(item.value), detail: String(item.count)}))]}/>}
    {sheet === 'sort' && <Sheet title="Ordenar emisoras" onClose={() => setSheet(null)}>
      {(Object.keys(sortLabels) as LibrarySort[]).map(value => <ActionRow key={value} icon={library.librarySort === value ? 'checkmark-circle' : 'swap-vertical-outline'} label={sortLabels[value]} detail={library.librarySort === value ? 'Actual' : undefined} onPress={() => {library.setLibrarySort(value); setSheet(null);}}/>)}
    </Sheet>}
    {sheet === 'edit' && <Sheet title={selected ? 'Renombrar colección' : 'Nueva colección'} onClose={() => {Keyboard.dismiss(); setSheet(null);}}>
      <Muted style={{marginBottom: 12}}>Un lugar para las radios de cada momento.</Muted>
      <TextInput autoFocus accessibilityLabel="Nombre de la colección" placeholder="Por ejemplo, Noches de jazz" placeholderTextColor={c.muted} maxLength={50} value={name} onChangeText={value => {setName(value); setError('');}} onSubmitEditing={save} returnKeyType="done"
        style={{minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.border, color: c.text, backgroundColor: c.surface, padding: 14, marginBottom: 12}}/>
      {!!error && <Label accessibilityLiveRegion="polite" style={{color: c.live, fontSize: 13, marginBottom: 8}}>{error}</Label>}
      <Button title={selected ? 'Guardar nombre' : 'Crear colección'} onPress={save}/>
    </Sheet>}
    {sheet === 'delete' && selected && <Sheet title={`¿Eliminar «${selected.name}»?`} onClose={() => setSheet(null)}>
      <Muted style={{paddingBottom: 16}}>Se elimina esta colección de tu dispositivo. Tus favoritos, historial y otras colecciones se conservan.</Muted>
      <Button title="Eliminar colección" icon="trash-outline" onPress={() => {library.deleteCollection(selected.id); setSelectedId(null); resetFilters(); setSheet(null);}}/>
      <View style={{height: 8}}/><Button title="Cancelar" secondary onPress={() => setSheet(null)}/>
    </Sheet>}
  </View>;
}
