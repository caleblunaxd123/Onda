import { useSyncExternalStore } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { PlayerEngine } from './player-engine';
import { useLibrary } from './library';
export const player = new PlayerEngine((station, onStatus) => {
  const audio = createAudioPlayer({uri:station.streamUrl}, {updateInterval:500});
  let remembered = false;
  const listener = audio.addListener('playbackStatusUpdate', status => {
    if (status.playing && !remembered) {useLibrary.getState().remember(station); remembered = true;}
    onStatus({playing:status.playing, loaded:status.isLoaded, buffering:status.isBuffering, finished:status.didJustFinish, error:!!status.error});
  });
  audio.setActiveForLockScreen(true, {title:station.name, artist:station.country, artworkUrl:station.artworkUrl ?? undefined});
  return {play: () => audio.play(), pause: () => audio.pause(), dispose: () => {listener.remove(); audio.pause(); audio.setActiveForLockScreen(false); audio.remove();}};
});
export const prepareAudio = () => setAudioModeAsync({playsInSilentMode:true, shouldPlayInBackground:true, interruptionMode:'doNotMix'});
export const usePlayer = () => useSyncExternalStore(player.subscribe, player.getSnapshot);
