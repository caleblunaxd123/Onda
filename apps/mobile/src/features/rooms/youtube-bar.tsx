import {Pressable} from 'react-native';
import {useTheme} from '../../theme';
import {Ionicons} from '../../icons';
import {Label} from '../../ui';

/**
 * Always-visible YouTube search in YouTube rooms (Rave-style). Hosts/co-hosts change the video for everyone;
 * guests propose it to the queue. Submitting opens the explorer with the results.
 */
export function YoutubeSearchBar({controller, disabled, onSearch}: {controller: boolean; disabled?: boolean; onSearch: (query: string) => void}) {
  const c = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={controller ? 'Buscar otro video en YouTube para la sala' : 'Buscar un video de YouTube para proponer'}
    disabled={disabled} onPress={() => onSearch('')}
    style={({pressed}) => ({flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: 22,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: disabled ? .5 : pressed ? .7 : 1})}>
    <Ionicons name="logo-youtube" size={20} color="#FF5268"/>
    <Label style={{flex: 1, fontSize: 13, color: c.muted}}>{controller ? 'Buscar en YouTube' : 'Proponer un video de YouTube'}</Label>
    <Ionicons name="search" size={18} color={c.primaryText}/>
  </Pressable>;
}
