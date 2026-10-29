import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo-modules-core';
import {useLibrary} from './library';
type QuickAccess = {update(snapshot: string): Promise<void>; requestWidget(): Promise<boolean>};
const native = Platform.OS === 'android' ? requireOptionalNativeModule<QuickAccess>('OndaQuickAccess') : null;
export const quickAccessAvailable = !!native;
export const requestQuickWidget = () => native?.requestWidget() ?? Promise.resolve(false);
export function watchQuickAccess() {
  if (!native) return () => {};
  let last = ''; let disposed = false; let timer: ReturnType<typeof setTimeout> | undefined;
  const update = () => {
    if (disposed || !useLibrary.persist.hasHydrated()) return;
    const snapshot = JSON.stringify({favorites: useLibrary.getState().favorites.slice(0, 3).map(s => ({id: s.id, name: s.name}))});
    if (snapshot === last) return;
    last = snapshot;
    native.update(snapshot).catch(() => {last = '';});
  };
  const schedule = () => {clearTimeout(timer); timer = setTimeout(update, 200);};
  const subscription = useLibrary.subscribe(schedule); const hydration = useLibrary.persist.onFinishHydration(schedule); schedule();
  return () => {disposed = true; clearTimeout(timer); subscription(); hydration();};
}
