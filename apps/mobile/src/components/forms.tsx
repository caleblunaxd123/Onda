import {useState} from 'react';
import {Pressable, TextInput, View, type KeyboardTypeOptions} from 'react-native';
import {useTheme} from '../theme';
import {Ionicons} from '../icons';
import {Label} from './primitives';
export function FormField({label, value, onChange, placeholder, secure, keyboardType, maxLength = 128, multiline}: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; secure?: boolean; keyboardType?: KeyboardTypeOptions; maxLength?: number; multiline?: boolean;
}) {
  const c = useTheme(); const [visible, setVisible] = useState(false);
  return <View style={{gap: 7}}>
    <Label style={{fontWeight: '700', fontSize: 13}}>{label}</Label>
    <View style={{borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14}}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.muted}
        secureTextEntry={secure && !visible} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} maxLength={maxLength} multiline={multiline}
        style={{flex: 1, minHeight: multiline ? 86 : 50, paddingVertical: 12, color: c.text, fontSize: 15}}/>
      {secure && <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setVisible(!visible)} style={{minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'}}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.muted}/></Pressable>}
    </View>
  </View>;
}
