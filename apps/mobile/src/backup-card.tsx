import {useState} from 'react';
import {View} from 'react-native';
import {useLibrary, useLibraryHydrated} from './library';
import {parseBackup, mergeBackup, serializeBackup, type LibraryBackup} from './library-backup';
import {readBackup, saveBackup} from './backup-files';
import {Button, Card, Label, Muted, Sheet} from './ui';

export function BackupCard() {
  const library = useLibrary(); const hydrated = useLibraryHydrated();
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState(false);
  const [preview, setPreview] = useState<LibraryBackup | null>(null);
  const feedback = (text: string, failed = false) => {setMessage(text); setError(failed);};
  const run = async (action: () => Promise<void>) => {setBusy(true); feedback(''); try {await action();} catch (e) {feedback(e instanceof Error ? e.message : 'No se pudo leer el respaldo.', true);} finally {setBusy(false);}};
  const restore = () => {
    if (!preview) return;
    try {const result = mergeBackup(useLibrary.getState(), preview); library.restoreBackup(result); setPreview(null);
      const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
      feedback(!result.addedFavorites && !result.addedCollections && !result.addedStations ? 'Tu biblioteca ya contenía este respaldo. No se han añadido duplicados.' :
        `Respaldo combinado: ${count(result.addedFavorites, 'favorita', 'favoritas')}, ${count(result.addedCollections, 'colección', 'colecciones')} y ${count(result.addedStations, 'emisora en colecciones', 'emisoras en colecciones')} añadidas.`);
    } catch (e) {setPreview(null); feedback((e as Error).message, true);}
  };
  return <Card>
    <Label style={{fontWeight: '800', fontSize: 17}}>Respaldo de tu biblioteca</Label>
    <Muted>Lleva tus favoritas y colecciones a otro celular o a la web. Guarda el archivo en un lugar seguro; no se sube al servidor de ONDA.</Muted>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      <Button title={busy ? 'Procesando…' : 'Exportar respaldo'} icon="download-outline" disabled={busy || !hydrated || (!library.favorites.length && !library.collections.length)} onPress={() => void run(async () => {const saved = await saveBackup(serializeBackup(useLibrary.getState())); if (!saved) return; feedback('Si guardaste el archivo, ya puedes importarlo en otro dispositivo.');})}/>
      <Button title="Importar respaldo" icon="cloud-upload-outline" secondary disabled={busy || !hydrated} onPress={() => void run(async () => {const raw = await readBackup(); if (raw === null) return; const parsed = parseBackup(raw); mergeBackup(useLibrary.getState(), parsed); setPreview(parsed);})}/>
    </View>
    {message ? <Label accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{fontSize: 13}}>{message}</Label> : null}
    {preview && <Sheet title="Combinar biblioteca" onClose={() => setPreview(null)}>
      <Label>{preview.favorites.length} {preview.favorites.length === 1 ? 'favorita' : 'favoritas'} · {preview.collections.length} {preview.collections.length === 1 ? 'colección' : 'colecciones'}</Label>
      <Muted>Se añadirán a las de este dispositivo. Las colecciones con el mismo nombre se combinan y las emisoras repetidas se omiten. El historial y tus ajustes se conservan.</Muted>
      <Button title="Combinar con mi biblioteca" onPress={restore}/><Button title="Cancelar" secondary onPress={() => setPreview(null)}/>
    </Sheet>}
  </Card>;
}
