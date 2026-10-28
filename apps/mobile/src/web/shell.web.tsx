import {useEffect, useRef, useState, type CSSProperties, type PropsWithChildren} from 'react';
import {Image} from 'react-native';
import {Link, router, usePathname} from 'expo-router';
import {Ionicons} from '../icons';
import {useLibrary} from '../library';
import {isActive, player, usePlayer} from '../player';
import {useTheme} from '../theme';
import {Artwork, Favorite, stateLabels} from '../ui';
import {useDesktop} from './layout';
import './desktop.css';

const navigation = [
  {href: '/', label: 'Inicio', icon: 'home-outline'},
  {href: '/world', label: 'Mundo', icon: 'earth-outline'},
  {href: '/radar', label: 'Radar', icon: 'radio-outline'},
  {href: '/library', label: 'Biblioteca', icon: 'albums-outline'},
] as const;
const logo = require('../../assets/brand/onda-logo-header.png');

export default function WebShell({children}: PropsWithChildren) {
  const desktop = useDesktop(); const c = useTheme(); const pathname = usePathname();
  const [query, setQuery] = useState(''); const search = useRef<HTMLInputElement>(null);
  const setTheme = useLibrary(s => s.setTheme);
  useEffect(() => {
    if (!desktop) return;
    const focus = (event: KeyboardEvent) => {if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {event.preventDefault(); search.current?.focus();}};
    window.addEventListener('keydown', focus); return () => window.removeEventListener('keydown', focus);
  }, [desktop]);
  if (!desktop) return <>{children}</>;
  const colors = {'--bg': c.bg, '--surface': c.surface, '--raised': c.surfaceAlt, '--text': c.text, '--muted': c.muted,
    '--line': c.border, '--cyan': c.primaryText, '--accent': c.accent, '--accent-soft': c.accentSoft} as CSSProperties;
  const title = pathname === '/world' ? 'Explorar el mundo' : pathname === '/library' ? 'Tu biblioteca' : pathname === '/radar' ? 'Radio Radar' : pathname === '/settings' ? 'Ajustes' : pathname === '/search' ? 'Buscar emisoras' : pathname === '/player' ? 'Reproductor' : 'Descubre tu próxima radio';
  return <div className={`onda-shell ${c.immersive ? 'is-immersive' : ''} ${c.isDark ? 'is-dark' : 'is-light'}`} style={colors}>
    <a className="onda-skip" href="#onda-content">Ir al contenido</a>
    <aside className="onda-sidebar" aria-label="Navegación principal">
      <Link href="/" asChild><a className="onda-brand" aria-label="ONDA, ir al inicio"><Image source={logo} style={{width: 152, height: 48}} resizeMode="contain"/></a></Link>
      <span className="onda-sidebar-caption">EL MUNDO SUENA AQUÍ</span>
      <nav>{navigation.map(item => <Link key={item.href} href={item.href} asChild><a className={`onda-nav ${pathname === item.href ? 'is-active' : ''}`} aria-current={pathname === item.href ? 'page' : undefined}><Ionicons name={item.icon} size={21}/>{item.label}{pathname === item.href && <span className="onda-nav-dot"/>}</a></Link>)}</nav>
      <div className="onda-sidebar-note"><span className="onda-orbit-small"><Ionicons name="planet-outline" size={28}/></span><strong>Sin fronteras.<br/>Sin cambiar de lugar.</strong><p>Encuentra una nueva frecuencia en cualquier rincón del mundo.</p><Link href="/world" asChild><a>Explorar el mapa <Ionicons name="arrow-forward" size={16}/></a></Link></div>
      <div className="onda-sidebar-bottom"><Link href="/settings" asChild><a className={`onda-nav ${pathname === '/settings' ? 'is-active' : ''}`}><Ionicons name="settings-outline" size={21}/>Ajustes</a></Link><small>ONDA Experience · Radio mundial</small></div>
    </aside>
    <div className="onda-workspace">
      <header className="onda-topbar"><span className="onda-breadcrumb">{title}</span>
        <form className="onda-global-search" role="search" onSubmit={event => {event.preventDefault(); router.push({pathname: '/search', params: {q: query.trim()}});}}>
          <Ionicons name="search-outline" size={19}/><input ref={search} aria-label="Buscar radios, países o géneros" placeholder="Busca una radio, país o género" value={query} onChange={event => setQuery(event.target.value)}/><kbd>Ctrl K</kbd>
        </form>
        <button className="onda-icon-button" aria-label={c.isDark ? 'Cambiar a tema claro' : 'Activar tema inmersivo'} onClick={() => setTheme(c.isDark ? 'light' : 'immersive')}><Ionicons name={c.isDark ? 'sunny-outline' : 'moon-outline'} size={21}/></button>
      </header>
      <main id="onda-content" className="onda-router" tabIndex={-1}>{children}</main>
    </div>
    <DesktopPlayer/>
  </div>;
}

function DesktopPlayer() {
  const s = usePlayer(); const active = isActive(s.state); const station = s.station;
  const lastVolume = useRef(1);
  return <footer className="onda-desktop-player" aria-label="Reproductor de radio">
    {station ? <>
      <button className="onda-playing-station" onClick={() => router.push('/player')} aria-label={'Abrir reproductor de ' + station.name}><Artwork key={station.id} station={station} size={52}/><span><strong>{station.name}</strong><small>{station.country} {station.tags[0] ? '· ' + station.tags[0] : ''}</small></span></button>
      <div className="onda-transport"><button className="onda-main-play" aria-label={active ? 'Pausar radio' : 'Reproducir radio'} onClick={player.toggle}><Ionicons name={active ? 'pause' : 'play'} size={24}/></button><div><span className={`onda-status ${s.state === 'playing' ? 'is-playing' : ''}`}><i/>{stateLabels[s.state]}</span><small role={s.state === 'error' ? 'alert' : undefined}>{s.error ?? 'Emisión en directo · Audio de la emisora'}</small></div></div>
      <div className="onda-player-options"><Favorite station={station}/><button className="onda-icon-button" aria-label={s.volume ? 'Silenciar radio' : 'Activar sonido'} onClick={() => {if (s.volume) {lastVolume.current = s.volume; player.setVolume(0);} else player.setVolume(lastVolume.current);}}><Ionicons name={s.volume ? 'volume-high-outline' : 'volume-mute-outline'} size={20}/></button><input aria-label="Volumen de radio" type="range" min="0" max="1" step="0.01" value={s.volume} onChange={event => player.setVolume(Number(event.target.value))}/><select aria-label="Temporizador de apagado" value={s.sleepAt ? 'active' : '0'} onChange={event => player.setSleep(Number(event.target.value))}><option value="0">Temporizador</option>{s.sleepAt && <option value="active">Temporizador activo</option>}{[15,30,60,90].map(value => <option key={value} value={value}>{value} minutos</option>)}</select>{s.sleepAt && <button className="onda-icon-button" aria-label="Cancelar temporizador" onClick={() => player.setSleep(0)}><Ionicons name="timer-outline" size={19}/></button>}</div>
    </> : <><span className="onda-idle-icon"><Ionicons name="headset-outline" size={26}/></span><div className="onda-idle-copy"><strong>Una frecuencia para cada momento.</strong><small>Elige una emisora y lleva el mundo contigo.</small></div><Link href="/search" asChild><a className="onda-button secondary">Buscar una radio <Ionicons name="arrow-forward" size={17}/></a></Link></>}
  </footer>;
}
