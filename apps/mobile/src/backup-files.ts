import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo-modules-core';
import {File, Paths} from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import {MAX_BACKUP_BYTES} from './library-backup';

export async function saveBackup(contents: string) {
  const native = Platform.OS === 'android' ? requireOptionalNativeModule<{saveBackup(contents: string, filename: string): Promise<boolean>}>('OndaQuickAccess') : null;
  if (native) return native.saveBackup(contents, `ONDA-favoritas-${new Date().toISOString().slice(0, 10)}.json`);
  if (!await Sharing.isAvailableAsync()) throw new Error('Este dispositivo no permite compartir archivos.');
  const file = new File(Paths.cache, `ONDA-favoritas-${new Date().toISOString().slice(0, 10)}.json`);
  try {
    file.write(contents);
    await Sharing.shareAsync(file.uri, {mimeType: 'application/json', dialogTitle: 'Guardar respaldo de ONDA', UTI: 'public.json'});
    return true;
  } finally { /* The recipient may still be reading the shared cache file. Android uses the document picker instead. */ }
}
export async function readBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({type: ['application/json', 'text/plain', 'application/octet-stream'], copyToCacheDirectory: true});
  if (result.canceled) return null;
  const asset = result.assets[0]; const file = new File(asset.uri);
  try {
    if ((asset.size ?? file.size) > MAX_BACKUP_BYTES) throw new Error('El archivo supera 5 MB.');
    return await file.text();
  } finally {if (file.exists) file.delete();}
}
