import {useState} from 'react';
import {useCountries, useStationFeed} from '../catalog';
import {daySeed} from '../discovery';
import {Ionicons} from '../icons';
import {recentIdsSnapshot, useLibrary} from '../library';
import {isActive, player, usePlayer} from '../player';
import {Artwork, Favorite, stateLabels, tagLabel} from '../ui';

export default function DesktopRadar() {
  const [seed, setSeed] = useState(daySeed); const [index, setIndex] = useState(0); const [country, setCountry] = useState('');
  const [recent] = useState(recentIdsSnapshot); const preferred = useLibrary(s => s.country); const tags = useLibrary(s => s.likedTags);
  const countries = useCountries(); const playback = usePlayer();
  const feed = useStationFeed({order:'discover', seed, country:country || undefined, boostTags:tags, exclude:recent}, {limit:12});
  const station = feed.items[index] ?? feed.items[0]; const current = station?.id === playback.station?.id; const active = current && isActive(playback.state);
  const shuffle = () => {setIndex(0); setSeed(Math.floor(Math.random()*1e9));};
  return <div className="onda-page"><div className="onda-page-inner"><span className="onda-eyebrow">CAMBIA DE FRECUENCIA</span><h1 className="onda-page-title">Sal de tu sintonía habitual.</h1><p className="onda-page-description">Elige una tarjeta, escucha algo nuevo y guarda lo que conecte contigo.</p>
    <div className="onda-filter-tabs"><button aria-pressed={!country} onClick={() => {setCountry(''); setIndex(0);}}>Todo el mundo</button><button aria-pressed={country === preferred} onClick={() => {setCountry(preferred); setIndex(0);}}>{countries.data?.find(item => item.code === preferred)?.name ?? preferred}</button><button onClick={shuffle}><Ionicons name="shuffle-outline" size={15}/> Barajar</button></div>
    {feed.isPending ? <div className="onda-empty" role="status">Buscando nuevas frecuencias…</div> : feed.isError ? <div className="onda-empty" role="alert"><h2>Radar sin señal</h2><p>{feed.error.message}</p><button className="onda-button secondary" onClick={() => feed.refetch()}>Reintentar</button></div> : !station ? <div className="onda-empty"><h2>No hay más emisoras en esta selección</h2><button className="onda-button secondary" onClick={shuffle}>Volver a descubrir</button></div> : <div className="onda-radar-layout">
      <section className="onda-radar-stage" aria-label="Emisora del radar"><span className="onda-eyebrow">RADAR · {String(index+1).padStart(2,'0')}</span><Artwork key={station.id} station={station} size={155}/><h2>{station.name}</h2><p>{station.country || 'Mundo'} · {station.tags.slice(0,2).map(tagLabel).join(' · ') || station.language}</p><span className={`onda-status ${current && playback.state === 'playing' ? 'is-playing' : ''}`}><i/>{current ? stateLabels[playback.state] : 'Una nueva radio por escuchar'}</span><div className="onda-radar-controls"><Favorite station={station} size={24}/><button className="onda-main-play" aria-label={(active ? 'Pausar radar ' : 'Escuchar radar ') + station.name} onClick={() => current ? player.toggle() : player.select(station)}><Ionicons name={active ? 'pause' : 'play'} size={29}/></button><button className="onda-icon-button" aria-label="Descubrir otra emisora" onClick={() => index+1 < feed.items.length ? setIndex(index+1) : shuffle()}><Ionicons name="arrow-forward-outline" size={24}/></button></div></section>
      <section><div className="onda-section-heading"><h2>En el radar</h2><span className="onda-text-link">Elige tu próxima parada</span></div><div className="onda-radar-list">{feed.items.map((item,position) => <button key={item.id} className="onda-radar-item" aria-pressed={position === index} onClick={() => setIndex(position)}><Artwork station={item} size={42}/><span><strong>{item.name}</strong><small>{item.country} · {item.tags[0] ? tagLabel(item.tags[0]) : item.codec}</small></span></button>)}</div>{feed.hasNextPage && !feed.capped && <div className="onda-pagination"><button className="onda-button secondary" disabled={feed.isFetchingNextPage} onClick={feed.loadMore}>{feed.isFetchingNextPage ? 'Cargando…' : 'Más descubrimientos'}</button></div>}</section>
    </div>}
  </div></div>;
}
