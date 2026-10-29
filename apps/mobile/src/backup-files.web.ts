import {MAX_BACKUP_BYTES} from './library-backup';
export async function saveBackup(contents: string) {
  const url = URL.createObjectURL(new Blob([contents], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = `ONDA-favoritas-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
export function readBackup(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.setAttribute('aria-label', 'Seleccionar respaldo de ONDA'); input.hidden = true; document.body.appendChild(input);
    const done = () => input.remove();
    input.oncancel = () => {done(); resolve(null);};
    input.onchange = async () => {
      try {const file = input.files?.[0]; if (!file) {resolve(null); return;}
        if (file.size > MAX_BACKUP_BYTES) throw new Error('El archivo supera 5 MB.');
        resolve(await file.text());
      } catch (error) {reject(error);} finally {done();}
    };
    input.click();
  });
}
