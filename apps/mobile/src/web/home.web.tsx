import {useMemo, useState, type CSSProperties} from 'react';
import {Link} from 'expo-router';
import {useCatalogStatus, useCountries, useStationFeed} from '../catalog';
import {daySeed, listeningProfile} from '../discovery';
import {Ionicons} from '../icons';
import {recentIdsSnapshot, uniqueBroadcasts, useLibrary} from '../library';
import {isActive, player, usePlayer} from '../player';
import {greeting, moods} from '../theme';
import {Artwork, formatCount, tagLabel} from '../ui';
import {FeedGrid, Section} from './stations.web';

export default function DesktopHome() {
  const library = useLibrary(); const playback = usePlayer(); const countries = useCountries(); const status = useCatalogStatus();
  const [recent] = useState(recentIdsSnapshot);
  const profile = useMemo(() => listeningProfile(library.favorites, library.history, library.collections), [library.favorites, library.history, library.collections]);
  const discover = useStationFeed({order: 'discover', seed: daySeed(), boostTags: library.likedTags, exclude: recent.slice(0,10)}, {limit: 8});
  const popular = useStationFeed({order: 'popular'}, {limit: 8});
  const countryName = countries.data?.find(country => country.code === library.country)?.name ?? library.country;
  const local = useStationFeed({country: library.country, order: 'popular'}, {limit: 8});
  const personal = useStationFeed({order: 'discover', seed: daySeed(), tag: profile.tags[0], exclude: recent}, {limit: 8, enabled: !!profile.tags[0]});
  const featured = local.items[0]; const current = featured?.id === playback.station?.id; const active = current && isActive(playback.state);
  const recentItems = uniqueBroadcasts(library.history).slice(0, 6);
  const countryPicks = (countries.data ?? []).filter(country => ['PE','US','ES','GB','FR','JP'].includes(country.code));
  return <div className="onda-page"><div className="onda-page-inner">
    <section className="onda-hero"><div><span className="onda-eyebrow">{greeting().text} · ONDA EXPERIENCE</span><h1>El mundo,<br/>en tu <em>frecuencia.</em></h1><p>Empieza con las radios de {countryName}, vuelve a tus favoritas y descubre nuevas frecuencias de todo el mundo.</p><div className="onda-hero-buttons"><Link href="/search" asChild><a className="onda-button"><Ionicons name="search-outline" size={17}/>Explorar el mundo</a></Link><Link href="/world" asChild><a className="onda-button secondary"><Ionicons name="earth-outline" size={17}/>Explorar el mapa</a></Link></div><div className="onda-hero-metrics"><span><strong>{status.data ? formatCount(status.data.playable) : '—'}</strong>radios HTTPS</span><span><strong>{countries.data ? formatCount(countries.data.length) : '—'}</strong>países</span></div></div>
      <div className="onda-featured"><span className="onda-eyebrow">Una frecuencia de {countryName}</span>{featured ? <><div className="onda-featured-content"><Artwork key={featured.id} station={featured} size={80}/><div><h2>{featured.name}</h2><p>{featured.country || 'Mundo'}{featured.region ? ' · ' + featured.region : ''}</p><p>{featured.tags.slice(0,2).map(tagLabel).join(' · ') || featured.language}</p></div></div><div className="onda-featured-bottom"><small>{current && playback.state === 'playing' ? '● EN VIVO AHORA' : 'Un clic y estás allí'}</small><button className="onda-play-round" aria-label={(active ? 'Pausar destacada ' : 'Escuchar destacada ') + featured.name} onClick={() => current ? player.toggle() : player.select(featured)}><Ionicons name={active ? 'pause' : 'play'} size={23}/></button></div></> : <><h2>{local.isError ? 'Tu próxima radio te espera' : !local.isPending ? 'Explora nuevas frecuencias' : 'Buscando una nueva frecuencia…'}</h2>{local.isError && <button className="onda-button secondary" onClick={() => local.refetch()}>Reintentar</button>}</>}</div>
    </section>
    <Section title="Tus favoritas" note="Las radios que te gustan, siempre a mano" href="/library">{library.favorites.length ? <FeedGrid items={library.favorites.slice(0,8)} pending={false} retry={() => {}}/> : <div className="onda-favorites-hint"><Ionicons name="heart-outline" size={23}/><span>Toca el corazón de una emisora para tenerla aquí, a un clic.</span></div>}</Section>
    <Section title={`Radios de ${countryName}`} note="Tu país de escucha, elegido en Ajustes o sugerido por la zona horaria"><div className="onda-filterbar"><Link href="/settings" asChild><a className="onda-text-link">{countryName} · Cambiar país</a></Link><Link href={{pathname: '/search', params: {country: library.country}}} asChild><a className="onda-text-link">Ver todas las radios de {countryName} <Ionicons name="arrow-forward" size={16}/></a></Link></div><FeedGrid items={local.items} pending={local.isPending} error={local.error?.message} retry={local.refetch}/></Section>
    {recentItems.length > 0 && <Section title="Vuelve a tu frecuencia" note="Las últimas radios que escuchaste" href="/library"><FeedGrid items={recentItems} pending={false} retry={() => {}}/></Section>}
    <Section title="¿Qué te apetece escuchar?"><div className="onda-moods">{moods.map(mood => <Link key={mood.tag} href={{pathname: '/search', params: {tag: mood.tag}}} asChild><a className="onda-mood" style={{'--mood': mood.color} as CSSProperties}><Ionicons name={mood.icon} size={21} color={mood.color}/>{mood.name}</a></Link>)}</div></Section>
    <Section title="Populares en el mundo" note="Emisoras que conectan con oyentes de todos los rincones" href="/search"><FeedGrid items={popular.items.slice(0,8)} pending={popular.isPending} error={popular.error?.message} retry={popular.refetch}/></Section>
    <Section title="Un viaje sin pasaporte" note="Explora el sonido de otro lugar" href="/world"><div className="onda-country-grid">{countryPicks.map(country => <Link key={country.code} href={{pathname: '/search', params: {country: country.code}}} asChild><a className="onda-country"><span className="onda-country-code">{country.code}</span><span><strong>{country.name}</strong><small>{formatCount(country.count)} radios</small></span></a></Link>)}</div></Section>
    <Section title={profile.tags[0] ? `Más ${tagLabel(profile.tags[0]).toLowerCase()} para tu día` : 'Fuera de tu sintonía habitual'} note="Descubrimientos reales del catálogo mundial" href="/search"><FeedGrid items={(profile.tags[0] ? personal.items : discover.items).slice(0,8)} pending={profile.tags[0] ? personal.isPending : discover.isPending} error={(profile.tags[0] ? personal.error : discover.error)?.message} retry={profile.tags[0] ? personal.refetch : discover.refetch}/></Section>
    <section className="onda-world-banner"><span><Ionicons name="earth-outline" size={40}/></span><div><strong>Cada punto tiene algo que contar.</strong><p>Acércate a una ciudad, elige una emisora y escucha qué está sonando al otro lado.</p></div><Link href="/world" asChild><a className="onda-button secondary">Abrir mapa <Ionicons name="arrow-forward" size={17}/></a></Link></section>
  </div></div>;
}
