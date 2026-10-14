import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCountries, useTags } from '../src/catalog';
import { useLibrary } from '../src/library';
import { useTheme } from '../src/theme';
import { deviceCountry } from '../src/region';
import { Ionicons } from '../src/icons';
import { Button, Chip, Label, Loading, Message, Muted, SearchField, flag, fold, formatCount } from '../src/ui';

export default function Onboarding() {
  const c = useTheme(); const library = useLibrary();
  const countries = useCountries(); const tags = useTags();
  const [step, setStep] = useState<0 | 1>(0);
  const detected = deviceCountry();
  const [country, setCountry] = useState(detected?.code ?? library.country);
  const [text, setText] = useState('');
  const [liked, setLiked] = useState<string[]>([]);
  const list = useMemo(() => (countries.data ?? []).filter(x => !text || fold(x.name).includes(fold(text))), [countries.data, text]);
  const finish = () => {library.finishOnboarding(country, liked, country === detected?.code ? 'auto' : 'manual'); router.replace('/');};
  return <View style={{flex: 1, padding: 20, gap: 16}}>
    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
      <Label style={{fontSize: 26, fontWeight: '900', color: c.primaryText, letterSpacing: 1}}>ONDA</Label>
      <Pressable accessibilityRole="button" onPress={finish} hitSlop={10}><Label style={{color: c.primaryText, fontWeight: '600'}}>Omitir</Label></Pressable>
    </View>
    <View style={{flexDirection: 'row', gap: 6}}>{[0, 1].map(i => <View key={i} style={{flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? c.primary : c.border}}/>)}</View>
    {step === 0 ? <>
      <View style={{gap: 4}}><Label accessibilityRole="header" style={{fontSize: 26, lineHeight: 32, fontWeight: '800'}}>¿Desde dónde escuchas?</Label><Muted style={{fontSize: 14}}>Mostraremos primero las radios de tu país{detected ? ', detectado por la zona horaria del teléfono' : ''}. No usamos GPS; puedes cambiarlo en Ajustes.</Muted></View>
      <SearchField value={text} onChange={setText} placeholder="Buscar país" label="Buscar país"/>
      {countries.isPending ? <Loading/> : countries.isError ? <Message title="No pudimos cargar los países" body={countries.error.message} retry={() => countries.refetch()}/> :
        <FlatList data={list} keyExtractor={x => x.code} style={{flex: 1}} initialNumToRender={20} keyboardShouldPersistTaps="handled"
          renderItem={({item}) => <Pressable accessibilityRole="radio" accessibilityState={{checked: item.code === country}} onPress={() => setCountry(item.code)} style={{minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, borderRadius: 14, backgroundColor: item.code === country ? c.primary + '18' : 'transparent'}}>
            <Text style={{fontSize: 24}}>{flag(item.code)}</Text><Label style={{flex: 1, fontWeight: item.code === country ? '700' : '500'}}>{item.name}</Label><Muted>{formatCount(item.count)}</Muted>
            {item.code === country && <Ionicons name="checkmark-circle" size={20} color={c.primaryText}/>}
          </Pressable>}/>}
      <Button title="Continuar" onPress={() => setStep(1)}/>
    </> : <>
      <View style={{gap: 4}}><Label accessibilityRole="header" style={{fontSize: 26, lineHeight: 32, fontWeight: '800'}}>¿Qué te gusta escuchar?</Label><Muted style={{fontSize: 14}}>Elige hasta 5 géneros. Los usamos solo en este dispositivo para variar tus recomendaciones.</Muted></View>
      {tags.isPending ? <Loading/> : tags.isError ? <Message title="No pudimos cargar los géneros" body={tags.error.message} retry={() => tags.refetch()}/> :
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1, alignContent: 'flex-start'}}>
          {(tags.data ?? []).slice(0, 30).map(t => <Chip key={t.value} label={t.label} selected={liked.includes(t.value)} onPress={() => setLiked(liked.includes(t.value) ? liked.filter(x => x !== t.value) : liked.length < 5 ? [...liked, t.value] : liked)}/>)}
        </View>}
      <View style={{flexDirection: 'row', gap: 10}}><View style={{flex: 1}}><Button title="Atrás" secondary onPress={() => setStep(0)}/></View><View style={{flex: 2}}><Button title={liked.length ? 'Empezar a escuchar' : 'Empezar sin elegir'} onPress={finish}/></View></View>
    </>}
  </View>;
}
