import { useSyncExternalStore } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { PlayerEngine } from './player-engine';
import { useLibrary } from './library';

/**
 * One native player at a time. Lock screen controls are required on Android for sustained background playback
 * (expo-audio SDK 57); `isLiveStream` hides the scrubber and seeking for radio.
 */
export const player = new PlayerEngine((station, streamUrl, onStatus) => {
  const audio = createAudioPlayer({uri: streamUrl}, {updateInterval: 500});
  let remembered = false;
  const listener = audio.addListener('playbackStatusUpdate', status => {
    // History only records stations that really produced audio.
    if (status.playing && !remembered) {useLibrary.getState().remember(station); remembered = true;}
    onStatus({playing: status.playing, loaded: status.isLoaded, buffering: status.isBuffering, finished: status.didJustFinish, error: !!status.error});
  });
  audio.setActiveForLockScreen(true, {title: station.name, artist: [station.region, station.country].filter(Boolean).join(' · '), artworkUrl: station.artworkUrl ?? undefined}, {isLiveStream: true});
  return {
    play: () => audio.play(), pause: () => audio.pause(),
    dispose: () => {listener.remove(); audio.pause(); audio.clearLockScreenControls(); audio.remove();},
  };
});
export const prepareAudio = () => setAudioModeAsync({playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix'});
export const usePlayer = () => useSyncExternalStore(player.subscribe, player.getSnapshot);
export const isActive = (state: string) => state === 'playing' || state === 'connecting' || state === 'buffering';
