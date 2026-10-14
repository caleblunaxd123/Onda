import {useState, type PropsWithChildren} from 'react';
import {FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '../icons';
import {useTheme} from '../theme';
import {fold} from '../format';
import {Label, Muted} from './primitives';
import {IconButton, SearchField} from './controls';
import {Loading, Message} from './feedback';

/** Bottom sheet used for menus, pickers and forms. */
export function Sheet({title, onClose, children, scroll = true}: PropsWithChildren<{title: string; onClose: () => void; scroll?: boolean}>) {
  const c = useTheme(); const insets = useSafeAreaInsets();
  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066'}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={{flex: 1}}/>
      <View accessibilityViewIsModal style={{backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 + insets.bottom, gap: 10, maxHeight: '88%', width: '100%', maxWidth: 480, alignSelf: 'center'}}>
        <View style={{alignSelf: 'center', width: 40, height: 4, borderRadius: 4, backgroundColor: c.border}}/>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Label accessibilityRole="header" numberOfLines={2} style={{flex: 1, fontSize: 19, lineHeight: 25, fontWeight: '800'}}>{title}</Label><IconButton icon="close" label="Cerrar" onPress={onClose}/></View>
        {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap: 4, paddingBottom: 8}}>{children}</ScrollView> : children}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export type PickerOption = {value: string; label: string; detail?: string; leading?: string};

/** Searchable list of catalog values (countries, languages, genres, places) with their real counts. */
export function OptionPicker({title, options, selected, onSelect, onClose, loading, error, retry}: {title: string; options: PickerOption[]; selected?: string; onSelect: (value: string) => void; onClose: () => void; loading?: boolean; error?: string; retry?: () => void}) {
  const c = useTheme(); const [text, setText] = useState('');
  const needle = fold(text);
  const rows = options.filter(o => !needle || fold(o.label).includes(needle) || o.value.toLowerCase() === needle);
  return <Sheet title={title} onClose={onClose} scroll={false}>
    <SearchField value={text} onChange={setText} placeholder="Filtrar" label={'Filtrar ' + title.toLowerCase()}/>
    {loading ? <Loading rows={4}/> : error ? <Message title="No se pudo cargar" body={error} retry={retry}/> :
      <FlatList data={rows} keyExtractor={o => o.value} keyboardShouldPersistTaps="handled" style={{maxHeight: 460}} initialNumToRender={20}
        ListEmptyComponent={<Muted style={{padding: 16, textAlign: 'center'}}>Sin coincidencias.</Muted>}
        renderItem={({item}) => <Pressable accessibilityRole="radio" accessibilityState={{checked: item.value === selected}} onPress={() => {onSelect(item.value); onClose();}} style={({pressed}) => ({minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, borderRadius: 12, opacity: pressed ? .6 : 1, backgroundColor: item.value === selected ? c.primary + '16' : 'transparent'})}>
          {item.leading ? <Text style={{fontSize: 22}}>{item.leading}</Text> : null}
          <Label numberOfLines={1} style={{flex: 1, fontWeight: item.value === selected ? '700' : '500'}}>{item.label}</Label>
          {item.detail ? <Muted>{item.detail}</Muted> : null}
          {item.value === selected && <Ionicons name="checkmark" size={18} color={c.primaryText}/>}
        </Pressable>}/>}
  </Sheet>;
}
