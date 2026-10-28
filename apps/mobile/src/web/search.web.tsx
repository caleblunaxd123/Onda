import {useEffect, useState} from 'react';
import {useLocalSearchParams} from 'expo-router';
import {useCountries, useLanguages, useStationFeed, useTags} from '../catalog';
import {useLibrary} from '../library';
import {formatCount} from '../ui';
import {FeedGrid} from './stations.web';

export default function DesktopSearch() {
  const params = useLocalSearchParams<{q?: string; country?: string; tag?: string}>();
  const [text, setText] = useState(params.q ?? ''); const [query, setQuery] = useState(params.q ?? '');
  const [country, setCountry] = useState(params.country ?? ''); const [tag, setTag] = useState(params.tag ?? ''); const [language, setLanguage] = useState('');
  const countries = useCountries(); const tags = useTags(); const languages = useLanguages();
  const remember = useLibrary(s => s.rememberSearch);
  useEffect(() => {const timer = setTimeout(() => setQuery(text.trim()),350); return () => clearTimeout(timer);}, [text]);
  const feed = useStationFeed({q: query || undefined, country: country || undefined, tag: tag || undefined, language: language || undefined, order: 'popular'}, {limit: 30});
  const filtered = !!(query || country || tag || language);
  return <div className="onda-page"><div className="onda-page-inner"><span className="onda-eyebrow">SINTONIZA ALGO NUEVO</span><h1 className="onda-page-title">Encuentra tu próxima frecuencia.</h1><p className="onda-page-description">Busca por nombre o combina país, género e idioma. Todo el catálogo, a tu manera.</p>
    <form className="onda-filterbar" role="search" onSubmit={event => {event.preventDefault(); if (text.trim()) remember(text.trim()); setQuery(text.trim());}}>
      <label>Emisora o término<input aria-label="Buscar emisoras por nombre" value={text} placeholder="Jazz, Londres, Radio Paradise…" onChange={event => setText(event.target.value)}/></label>
      <label>País<select aria-label="Filtrar por país" value={country} onChange={event => setCountry(event.target.value)}><option value="">Todo el mundo</option>{countries.data?.map(item => <option key={item.code} value={item.code}>{item.name} · {formatCount(item.count)}</option>)}</select></label>
      <label>Género<select aria-label="Filtrar por género" value={tag} onChange={event => setTag(event.target.value)}><option value="">Todos los géneros</option>{tag && !tags.data?.some(item => item.value === tag) && <option value={tag}>{tag}</option>}{tags.data?.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Idioma<select aria-label="Filtrar por idioma" value={language} onChange={event => setLanguage(event.target.value)}><option value="">Todos los idiomas</option>{languages.data?.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      {filtered && <button type="button" onClick={() => {setText(''); setCountry(''); setTag(''); setLanguage('');}}>Limpiar filtros</button>}
    </form>
    {(countries.isError || tags.isError || languages.isError) && <p className="onda-page-description" role="status">Algún filtro no se pudo cargar. La búsqueda sigue disponible; vuelve a abrir esta página para reintentar los filtros.</p>}
    <div className="onda-section-heading"><h2>{filtered ? 'Resultados de búsqueda' : 'Radios populares del mundo'}</h2><span className="onda-text-link" aria-live="polite">{feed.total !== null ? `${formatCount(feed.total)} emisoras` : 'Buscando…'}</span></div>
    <FeedGrid items={feed.items} pending={feed.isPending} error={feed.error?.message} retry={feed.refetch}/>
    {feed.hasNextPage && !feed.capped && <div className="onda-pagination"><button className="onda-button secondary" onClick={feed.loadMore} disabled={feed.isFetchingNextPage}>{feed.isFetchingNextPage ? 'Cargando más radios…' : 'Cargar más emisoras'}</button></div>}
    {feed.capped && <p className="onda-local-note">Afina la búsqueda para ver más emisoras sin cargar todo el catálogo en memoria.</p>}
  </div></div>;
}
