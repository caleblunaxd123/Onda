import {useState, type PropsWithChildren} from 'react';
import {Link} from 'expo-router';
import {Ionicons} from '../icons';
import {isActive, player, usePlayer} from '../player';
import {Artwork, Favorite, StationActions, stateLabels, tagLabel} from '../ui';
import type {Station} from '../types';

export function StationCard({station, onRemove}: {station: Station; onRemove?: () => void}) {
  const playback = usePlayer(); const [menu, setMenu] = useState(false);
  const current = playback.station?.id === station.id; const active = current && isActive(playback.state);
  const play = () => current ? player.toggle() : player.select(station);
  return <article className="onda-station-card">
    <button className="onda-card-main" onClick={play} aria-label={(active ? 'Pausar ' : 'Escuchar ') + station.name}>
      <Artwork key={station.id} station={station} size={64}/><span className="onda-card-copy"><strong title={station.name}>{station.name}</strong><small>{station.country || 'Radio internacional'}{station.tags[0] ? ' · ' + tagLabel(station.tags[0]) : ''}</small></span>
    </button>
    <div className="onda-card-footer"><span className={`onda-status ${current && playback.state === 'playing' ? 'is-playing' : ''}`}><i/>{current ? stateLabels[playback.state] : station.codec || 'Radio'}</span><div className="onda-card-actions"><Favorite station={station} size={18}/><button className="onda-icon-button" aria-label={'Opciones de ' + station.name} onClick={() => setMenu(true)}><Ionicons name="ellipsis-horizontal" size={19}/></button><button className="onda-icon-button" aria-label={(active ? 'Pausar ' : 'Reproducir ') + station.name} onClick={play}><Ionicons name={active ? 'pause' : 'play'} size={18}/></button></div></div>
    {menu && <StationActions station={station} onClose={() => setMenu(false)} onRemove={onRemove}/>}
  </article>;
}

export function Section({title, note, href, children}: PropsWithChildren<{title: string; note?: string; href?: '/' | '/search' | '/library' | '/world'}>) {
  return <section className="onda-section"><div className="onda-section-heading"><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{href && <Link href={href} asChild><a className="onda-text-link">Ver todas <Ionicons name="arrow-forward" size={15}/></a></Link>}</div>{children}</section>;
}

export function FeedGrid({items, pending, error, retry, onRemove}: {items: Station[]; pending: boolean; error?: string; retry: () => unknown; onRemove?: (stationId: string) => void}) {
  if (pending) return <div className="onda-card-grid" role="status" aria-label="Cargando emisoras">{Array.from({length: 4},(_,i) => <div className="onda-loading" key={i}/>)}</div>;
  if (error) return <div className="onda-empty" role="alert"><h2>No pudimos cargar las emisoras</h2><p>{error}</p><button className="onda-button secondary" onClick={() => retry()}>Volver a intentar</button></div>;
  if (!items.length) return <div className="onda-empty"><h2>No hay emisoras en esta selección</h2><p>Prueba con otro país, género o término de búsqueda.</p></div>;
  return <div className="onda-card-grid">{items.map(station => <StationCard key={station.id} station={station} onRemove={onRemove ? () => onRemove(station.id) : undefined}/>)}</div>;
}
