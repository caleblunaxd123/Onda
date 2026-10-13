import {useCallback, useRef, useState} from 'react';
import {Keyboard, View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {request} from '../src/api';
import {useLibrary} from '../src/library';
import {useTheme} from '../src/theme';
import {Ionicons} from '../src/icons';
import {Button, Card, Chip, Label, Loading, Muted, Page, ScreenHeader, StationRow} from '../src/ui';
import {FormField} from '../src/components/forms';
import type {Station} from '../src/types';
type Answer = {message: string; explanation: string; engine: 'local-ai' | 'catalog-rules'; filters: {country: string | null; tag: string | null; language: string | null}; stations: Station[]};
type Turn = {id: number; prompt: string; answer?: Answer; error?: string};
export default function AssistantScreen() {
  const c = useTheme(); const library = useLibrary(); const [text, setText] = useState(''); const [turns, setTurns] = useState<Turn[]>([]); const [busy, setBusy] = useState(false); const [activeId, setActiveId] = useState(0);
  const controller = useRef<AbortController | null>(null); const generation = useRef(0);
  useFocusEffect(useCallback(() => () => {generation.current++; controller.current?.abort(); setBusy(false);}, []));
  const send = async (prompt = text) => {
    if (busy || prompt.trim().length < 2) return;
    Keyboard.dismiss(); const id = ++generation.current; const abort = new AbortController(); controller.current = abort;
    setTurns(list => [...list, {id, prompt}].slice(-10)); setText(''); setBusy(true); setActiveId(id);
    try {
      const answer = await request<Answer>('/api/v1/assistant/discover', {method: 'POST', timeoutMs: 45000, signal: abort.signal, body: {text: prompt.slice(0, 500), country: library.country, tags: library.likedTags}});
      if (generation.current === id) setTurns(list => list.map(turn => turn.id === id ? {...turn, answer} : turn));
    } catch (e) {
      if (!abort.signal.aborted && generation.current === id) setTurns(list => list.map(turn => turn.id === id ? {...turn, error: e instanceof Error ? e.message : 'No se pudo buscar.'} : turn));
    } finally {if (generation.current === id) {setBusy(false); controller.current = null;}}
  };
  return <View style={{flex: 1, backgroundColor: c.bg}}><ScreenHeader title="ONDA AI" subtitle="Tu próxima frecuencia puede sorprenderte." back/><Page>
    <Card style={{backgroundColor: c.accentSoft, gap: 14}}><View style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}><Ionicons name="sparkles" size={32} color={c.accent}/><Label style={{fontSize: 22, lineHeight: 28, fontWeight: '900', flex: 1}}>Cuéntame qué te apetece escuchar.</Label></View><Muted>Te ayudo a descubrir radios reales del catálogo y compartirlas en una sala.</Muted><View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>{['Quiero salsa peruana', 'Muéstrame radios de Japón', 'Música tranquila para trabajar', 'Noticias en inglés'].map(prompt => <Chip key={prompt} label={prompt} onPress={() => void send(prompt)}/>)}</View></Card>
    {turns.map(turn => <View key={turn.id} style={{gap: 12}}><View style={{padding: 14, borderRadius: 18, alignSelf: 'flex-end', maxWidth: '90%', backgroundColor: c.primary}}><Label style={{color: c.onPrimary}}>{turn.prompt}</Label></View>
      {turn.answer ? <><Label style={{fontWeight: '800'}}>{turn.answer.message}</Label><Muted>{turn.answer.explanation}</Muted><Muted style={{fontSize: 11, color: c.accent}}>{turn.answer.engine === 'local-ai' ? 'IA privada en el servidor de ONDA' : 'Búsqueda guiada del catálogo · IA no disponible en esta consulta'}</Muted>{turn.answer.stations.map(station => <StationRow key={station.id} station={station} queue={{stations: turn.answer!.stations, title: 'ONDA AI'}}/>)}</> : turn.error ? <Card><Muted accessibilityRole="alert">{turn.error}</Muted><Button title="Reintentar esta búsqueda" secondary disabled={busy} onPress={() => void send(turn.prompt)}/></Card> : busy && turn.id === activeId ? <Loading label="Explorando el catálogo…"/> : <Muted>Búsqueda detenida.</Muted>}
    </View>)}
    <FormField label="Qué te gustaría escuchar" value={text} onChange={setText} placeholder="Un país, género, idioma o estado de ánimo…" multiline maxLength={500}/>
    <Button title={busy ? 'Buscando…' : 'Descubrir radios'} icon="sparkles-outline" disabled={busy || text.trim().length < 2} onPress={() => void send()}/>
    {busy && <Button title="Detener búsqueda" secondary onPress={() => {generation.current++; controller.current?.abort(); controller.current = null; setBusy(false);}}/>}
    <Muted style={{textAlign: 'center', fontSize: 11}}>Tu consulta y géneros elegidos se envían a ONDA. La conversación permanece en esta pantalla y no se almacena en el servidor.</Muted>
  </Page></View>;
}
