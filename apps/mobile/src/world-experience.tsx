import {useEffect, useRef, useState} from 'react';
import {Pressable, View} from 'react-native';
import {GlobeMap} from './globe-map';
import type {GlobeHandle} from './globe-types';
import {useWorldExplorer, WorldPanel, SelectedStation} from './world';
import {useDesktop} from './web/layout';
import {useTheme} from './theme';
import {IconButton, Label, Muted, OptionPicker, flag, formatCount} from './ui';
import type {Bounds} from './geo';
import {Ionicons} from './icons';

export default function WorldExperience() {
  const c = useTheme(); const e = useWorldExplorer(); const desktop = useDesktop();
  const globe = useRef<GlobeHandle>(null); const centered = useRef(false);
  const [ready, setReady] = useState(false); const [expanded, setExpanded] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false); const [mode, setMode] = useState<'earth' | 'streets'>('earth'); const [error, setError] = useState('');
  const fit = (bounds: Bounds | null) => {if (bounds) globe.current?.send({type: 'fit', bounds});};
  const countryName = e.countries.data?.find(x => x.code === e.country)?.name;
  useEffect(() => {
    if (!ready || centered.current || !e.countries.data) return;
    centered.current = true;
    const b = e.countries.data.find(x => x.code === e.preferred)?.bounds;
    if (b) globe.current?.send({type: 'focus', center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]});
  }, [ready, e.countries.data, e.preferred]);
  const panel = <WorldPanel desktop explorer={e}
    onFocusStation={s => {if (s.latitude !== null && s.longitude !== null) globe.current?.send({type: 'focus', center: [s.longitude, s.latitude], zoom: Math.max(e.zoom.current, 6)}); if (!desktop) setExpanded(false);}}
    onFocusCountry={fit} onFocusPlace={(lat, lon) => globe.current?.send({type: 'focus', center: [lon, lat], zoom: 8})}
    onReset={() => globe.current?.send({type: 'home'})}/>;
  return <View style={{flex: 1, flexDirection: desktop ? 'row' : 'column', backgroundColor: '#101B32'}}>
    <View style={{flex: 1, minWidth: 0}}>
      <GlobeMap ref={globe} features={e.features} selectedId={e.selectedId} onReady={() => setReady(true)} onError={setError}
        onViewport={e.onViewport} onSelect={e.select} onGroup={() => {e.select(null);}}/>
      <View style={{position: 'absolute', left: 12, top: 12, right: 72, gap: 8}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Buscar país o ciudad" onPress={() => setCountryOpen(true)} style={{flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 48, borderRadius: 18, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border}}>
          <Ionicons name="search" color={c.primaryText} size={20}/><View style={{flex: 1}}><Label numberOfLines={1} style={{fontWeight: '800'}}>{countryName ? `${flag(e.country)} ${countryName}` : 'Explora el planeta'}</Label><Muted style={{fontSize: 11}}>Buscar país o ciudad</Muted></View><Ionicons name="chevron-down" color={c.muted} size={17}/>
        </Pressable>
        {!!error && <Pressable accessibilityRole="button" accessibilityLabel="Ver lista de emisoras" onPress={() => setExpanded(true)} style={{padding: 10, borderRadius: 12, backgroundColor: c.bg}}><Muted>{error}</Muted></Pressable>}
      </View>
      <View style={{position: 'absolute', right: 10, top: 12, gap: 8}}>
        <IconButton icon="globe-outline" label="Ver globo completo" onPress={() => {setExpanded(false); globe.current?.send({type: 'home'});}}/>
        <IconButton icon="add" label="Acercar" onPress={() => globe.current?.send({type: 'zoom', delta: 1})}/>
        <IconButton icon="remove" label="Alejar" onPress={() => globe.current?.send({type: 'zoom', delta: -1})}/>
        <IconButton icon="navigate" label="Centrar en mi país (sin GPS)" onPress={() => fit(e.countries.data?.find(x => x.code === e.preferred)?.bounds ?? null)}/>
        <IconButton icon={mode === 'earth' ? 'map-outline' : 'earth-outline'} label={mode === 'earth' ? 'Ver mapa con calles y nombres' : 'Ver Tierra con imágenes NASA'} onPress={() => {const value = mode === 'earth' ? 'streets' : 'earth'; setMode(value); setError(''); globe.current?.send({type: 'mode', value});}}/>
      </View>
      {!desktop && !expanded && <View style={{position: 'absolute', bottom: 38, left: 10, right: 10, borderRadius: 22, overflow: 'hidden', backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, padding: 12, gap: 8}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver emisoras de esta zona" onPress={() => setExpanded(true)} style={{flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 10}}>
          <View style={{flex: 1}}><Label numberOfLines={1} style={{fontWeight: '800', fontSize: 17}}>{e.region || countryName || 'Radios en esta zona'}</Label><Muted>{e.total === null ? 'Buscando emisoras…' : `${formatCount(e.total)} emisoras · Ver lista`}</Muted></View><Ionicons name="chevron-up" color={c.primaryText} size={22}/>
        </Pressable>
        {e.selected ? <SelectedStation station={e.selected} onClose={() => e.select(null)}/> : <Muted style={{fontSize: 11}}>Gira el globo. Toca un punto; si agrupa radios, acércate.</Muted>}
      </View>}
      {!desktop && expanded && <View style={{position: 'absolute', top: '25%', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: c.bg, borderWidth: 1, borderColor: c.border}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver al globo" onPress={() => setExpanded(false)} style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 48, borderBottomWidth: 1, borderColor: c.border}}><Ionicons name="chevron-down" color={c.primaryText} size={20}/><Label style={{fontWeight: '700'}}>Volver al globo</Label></Pressable>{panel}
      </View>}
    </View>
    {desktop && <View style={{width: 360, borderLeftWidth: 1, borderColor: c.border}}>{panel}</View>}
    {countryOpen && <OptionPicker title="Elige un país para explorar" selected={e.country} onClose={() => setCountryOpen(false)} loading={e.countries.isPending} error={e.countries.error?.message} retry={() => e.countries.refetch()}
      options={(e.countries.data ?? []).map(x => ({value: x.code, label: x.name, leading: flag(x.code), detail: formatCount(x.count)}))}
      onSelect={code => {e.setCountry(code); fit(e.countries.data?.find(x => x.code === code)?.bounds ?? null); setCountryOpen(false); setExpanded(true);}}/>}
  </View>;
}
