import { Alert, TextInput, View } from 'react-native';
import { useLibrary } from '../src/library';
import { useTheme } from '../src/theme';
import { Page, Heading, Label, Card, Button } from '../src/ui';
export default function Settings() {
 const c=useTheme();const library=useLibrary();
 return <Page><Heading>A tu manera.</Heading><Card><Label>Cuenta invitada</Label><Label>Tus favoritos, historial y colecciones se guardan solo en este dispositivo. La sincronización de cuenta aún no está habilitada.</Label></Card><Heading>Apariencia</Heading><View style={{gap:8}}>{(['dark','light','system'] as const).map((theme,i)=><Button key={theme} title={['Oscuro','Claro','Automático'][i]} secondary={library.theme!==theme} onPress={()=>library.setTheme(theme)}/>)}</View>
 <Heading>País preferido</Heading><TextInput accessibilityLabel="País preferido, código de dos letras" value={library.country} maxLength={2} autoCapitalize="characters" onChangeText={v=>library.setCountry(v.toUpperCase().replace(/[^A-Z]/g,''))} style={{backgroundColor:c.surface,color:c.text,minHeight:52,padding:16,borderRadius:16}}/><Label>Usa PE, US, JP, ES u otro código de dos letras.</Label>
 <Heading>Privacidad</Heading><Label>ONDA no solicita ubicación GPS ni graba transmisiones. Al escuchar, el proveedor de la emisora recibe tu conexión. Los logos y transmisiones pertenecen a sus respectivos titulares.</Label><Button title="Borrar biblioteca local" secondary onPress={()=>Alert.alert('Borrar datos locales','Esta acción elimina tus favoritos, historial, colecciones y búsquedas de este dispositivo.',[{text:'Cancelar',style:'cancel'},{text:'Borrar',style:'destructive',onPress:library.clear}])}/>
 <Label>ONDA · El mundo suena aquí. Versión de desarrollo 0.1. Catálogo: Radio Browser.</Label></Page>;
}
