import {useState} from 'react';
import {TextInput} from 'react-native';
import {Link} from 'expo-router';
import {Ionicons} from '../icons';
import {uniqueBroadcasts, useLibrary} from '../library';
import {Button, Label, Sheet} from '../ui';
import {useTheme} from '../theme';
import {FeedGrid} from './stations.web';

export default function DesktopLibrary() {
  const library = useLibrary(); const c = useTheme();
  const [tab, setTab] = useState<'favorites' | 'history' | 'collections'>('favorites');
  const [selectedId, setSelectedId] = useState<string | null>(null); const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false); const [name, setName] = useState(''); const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const selected = tab === 'collections' ? library.collections.find(item => item.id === selectedId) : undefined;
  const source = selected?.stations ?? (tab === 'collections' ? [] : tab === 'favorites' ? library.favorites : uniqueBroadcasts(library.history));
  const needle = query.trim().toLocaleLowerCase();
  const stations = source.filter(station => [station.name, station.country, ...station.tags].join(' ').toLocaleLowerCase().includes(needle));
  const collections = library.collections.filter(item => item.name.toLocaleLowerCase().includes(needle));
  const create = () => {setSelectedId(null); setTab('collections'); setName(''); setError(''); setEditing(true);};
  const save = () => {
    if (selected) {if (!library.renameCollection(selected.id,name)) {setError('Escribe un nombre para tu colección.'); return;}}
    else {const id = library.createCollection(name); if (!id) {setError('Escribe un nombre para tu colección.'); return;} setSelectedId(id);}
    setEditing(false); setQuery('');
  };
  return <div className="onda-page"><div className="onda-page-inner"><span className="onda-eyebrow">TU RINCÓN EN EL MUNDO</span><div className="onda-page-toolbar"><div><h1 className="onda-page-title">{selected?.name ?? 'Tu biblioteca.'}</h1><p className="onda-page-description" style={{marginBottom:0}}>Las frecuencias a las que siempre quieres volver.</p></div><button className="onda-button secondary" onClick={create}><Ionicons name="add-outline" size={19}/>Crear colección</button></div>
    <div className="onda-filter-tabs" aria-label="Secciones de biblioteca">{([{id:'favorites',name:'Favoritos'}, {id:'history',name:'Historial'}, {id:'collections',name:'Colecciones'}] as const).map(item => <button key={item.id} aria-pressed={tab === item.id} onClick={() => {setTab(item.id); setSelectedId(null); setQuery('');}}>{item.name} <span>· {library[item.id].length}</span></button>)}</div>
    <div className="onda-filterbar"><input aria-label="Buscar en tu biblioteca" placeholder="Encuentra una emisora guardada…" value={query} onChange={event => setQuery(event.target.value)}/>{selected && <><button onClick={() => setSelectedId(null)}>Todas las colecciones</button><button onClick={() => {setName(selected.name); setError(''); setEditing(true);}}>Renombrar</button><button onClick={() => setDeleting(true)}>Eliminar colección</button></>}</div>
    {tab === 'collections' && !selected ? collections.length ? <div className="onda-card-grid">{collections.map(item => <button className="onda-collection-card" key={item.id} aria-label={'Abrir colección ' + item.name} onClick={() => {setSelectedId(item.id); setQuery('');}}><Ionicons name="albums-outline" size={30}/><strong>{item.name}</strong><small>{item.stations.length} emisoras</small></button>)}</div> : <div className="onda-empty"><Ionicons name="albums-outline" size={35}/><h2>{needle ? 'Sin coincidencias' : 'Una colección para cada momento'}</h2><p>Agrupa tus emisoras para trabajar, viajar o desconectar.</p>{!needle && <button className="onda-button" onClick={create}>Crear mi primera colección</button>}</div>
      : stations.length ? <FeedGrid items={stations} pending={false} retry={() => {}} onRemove={selected ? id => library.removeFromCollection(selected.id, id) : undefined}/> : <div className="onda-empty"><Ionicons name={tab === 'history' ? 'time-outline' : 'heart-outline'} size={35}/><h2>{needle ? 'No hay coincidencias' : selected ? 'Dale sonido a tu colección' : tab === 'favorites' ? 'Aquí viven tus favoritas' : 'Tu viaje empieza con una radio'}</h2><p>{selected ? 'Desde las opciones de cualquier emisora, elige Guardar en una colección.' : tab === 'history' ? 'Tu historial aparece cuando una emisora comienza a reproducirse.' : 'Marca el corazón de una emisora para tenerla siempre a mano.'}</p><Link href="/search" asChild><a className="onda-button secondary">Descubrir emisoras</a></Link></div>}
    <p className="onda-local-note"><Ionicons name="shield-checkmark-outline" size={15}/>Tu biblioteca se guarda en este navegador. Sin crear una cuenta.</p>
    {editing && <Sheet title={selected ? 'Renombrar colección' : 'Nueva colección'} onClose={() => setEditing(false)}><TextInput accessibilityLabel="Nombre de la colección" placeholder="Por ejemplo, Música para trabajar" autoFocus value={name} onChangeText={setName} maxLength={50} onSubmitEditing={save} style={{padding:14, backgroundColor:c.surfaceAlt, color:c.text, borderRadius:12, minHeight:48}}/>{error && <Label accessibilityRole="alert">{error}</Label>}<Button title={selected ? 'Guardar nombre' : 'Crear colección'} onPress={save}/><Button title="Cancelar" secondary onPress={() => setEditing(false)}/></Sheet>}
    {deleting && selected && <Sheet title={'Eliminar ' + selected.name} onClose={() => setDeleting(false)}><Label>Se eliminará esta colección. Las emisoras permanecerán en favoritos y en las demás colecciones.</Label><Button title="Eliminar colección" onPress={() => {library.deleteCollection(selected.id); setSelectedId(null); setDeleting(false);}}/><Button title="Cancelar" secondary onPress={() => setDeleting(false)}/></Sheet>}
  </div></div>;
}
