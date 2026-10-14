import {useState} from 'react';
import {Pressable, TextInput, View} from 'react-native';
import {useTheme} from '../../theme';
import {Ionicons} from '../../icons';

/**
 * Always-visible YouTube search in YouTube rooms (Rave-style). Hosts/co-hosts change the video for everyone;
 * guests propose it to the queue. Submitting opens the explorer with the results.
 */
export function YoutubeSearchBar({controller, disabled, onSearch}: {controller: boolean; disabled?: boolean; onSearch: (query: string) => void}) {
  const c = useTheme();
  const [query, setQuery] = useState('');
  const submit = () => {onSearch(query.trim()); setQuery('');};
  return <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingLeft: 14, paddingRight: 4, borderRadius: 24,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: disabled ? .5 : 1}}>
    <Ionicons name="logo-youtube" size={20} color="#FF5268"/>
    <TextInput value={query} onChangeText={text => setQuery(text.slice(0, 200))} editable={!disabled}
      accessibilityLabel={controller ? 'Buscar otro video en YouTube para la sala' : 'Buscar un video de YouTube para proponer'}
      placeholder={controller ? 'Buscar otro video en YouTube…' : 'Proponer un video de YouTube…'} placeholderTextColor={c.muted}
      returnKeyType="search" onSubmitEditing={submit} style={{flex: 1, color: c.text, fontSize: 14, paddingVertical: 10}}/>
    <Pressable accessibilityRole="button" accessibilityLabel={query.trim() ? `Buscar ${query.trim()} en YouTube` : 'Abrir el explorador de YouTube'}
      disabled={disabled} onPress={submit}
      style={({pressed}) => ({width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary, opacity: pressed ? .7 : 1})}>
      <Ionicons name="search" size={18} color={c.onPrimary}/>
    </Pressable>
  </View>;
}
