import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import {create} from 'zustand';
import {createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState,
  type AudioPlayer, type AudioSource, type RecordingOptions} from 'expo-audio';
import {prepareAudio} from '../../player';
import {chatLimits} from './chat';
import {setChatAudio} from './client';

/**
 * Voice notes only ever touch this device's audio. Recording or listening pauses the room locally
 * (setChatAudio) and never sends SetPlayback, so nobody else's playback changes.
 */
const voicePreset: RecordingOptions = {...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000};

type VoiceState = {id: string | null; playing: boolean; loading: boolean; position: number; duration: number; error: string};
export const useVoicePlayer = create<VoiceState>(() => ({id: null, playing: false, loading: false, position: 0, duration: 0, error: ''}));
let current: AudioPlayer | null = null;
let ticket = 0;
export function stopVoice() {
  ticket++;
  const player = current; current = null;
  try {player?.remove();} catch {/* already released */}
  useVoicePlayer.setState({id: null, playing: false, loading: false, position: 0, duration: 0});
  setChatAudio(false);
}
/** One voice note at a time: tapping another one stops the previous. */
export async function toggleVoice(id: string, source: () => Promise<AudioSource>) {
  const state = useVoicePlayer.getState();
  if (state.id === id && current) {
    if (state.playing) {current.pause(); useVoicePlayer.setState({playing: false}); setChatAudio(false);}
    else {setChatAudio(true); current.play(); useVoicePlayer.setState({playing: true});}
    return;
  }
  stopVoice();
  const mine = ++ticket;
  useVoicePlayer.setState({id, loading: true, error: ''});
  try {
    const resolved = await source();
    if (mine !== ticket) return;
    setChatAudio(true);
    const player = createAudioPlayer(resolved, {updateInterval: 250});
    current = player;
    player.addListener('playbackStatusUpdate', status => {
      if (mine !== ticket) return;
      if (status.didJustFinish) {stopVoice(); return;}
      useVoicePlayer.setState({playing: status.playing, loading: !status.isLoaded || status.isBuffering && !status.playing,
        position: status.currentTime * 1000, duration: status.duration * 1000});
    });
    player.play();
  } catch {
    if (mine === ticket) {stopVoice(); useVoicePlayer.setState({error: 'No se pudo reproducir la nota de voz.'});}
  }
}

export type VoiceClip = {uri: string; durationMs: number};
/** Recorder lifecycle: permission only when the person taps the microphone; files are cleaned up by the caller. */
export function useVoiceRecorder(onDiscard: (clip: VoiceClip) => void) {
  const recorder = useAudioRecorder(voicePreset);
  const status = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'review'>('idle');
  const [clip, setClip] = useState<VoiceClip | null>(null);
  const [error, setError] = useState('');
  const live = useRef({phase, clip});
  useEffect(() => {live.current = {phase, clip};}, [phase, clip]);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRef = useRef<() => Promise<void>>(async () => {});
  const clearLimit = () => {if (limit.current) clearTimeout(limit.current); limit.current = null;};
  const discard = useRef(onDiscard);
  useEffect(() => {discard.current = onDiscard;}, [onDiscard]);
  const restoreMode = () => {void (Platform.OS === 'ios' ? setAudioModeAsync({allowsRecording: false}).then(prepareAudio) : prepareAudio()).catch(() => {});};

  const start = useCallback(async () => {
    if (live.current.phase !== 'idle') return;
    setError(''); setPhase('starting');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPhase('idle');
        setError(permission.canAskAgain ? 'Para grabar una nota de voz, permite el micrófono.' : 'El micrófono está bloqueado. Actívalo para ONDA en los ajustes del sistema.');
        return;
      }
      stopVoice(); setChatAudio(true);
      if (Platform.OS === 'ios') await setAudioModeAsync({allowsRecording: true, playsInSilentMode: true});
      await recorder.prepareToRecordAsync();
      recorder.record();
      live.current = {phase: 'recording', clip: null}; setPhase('recording');
      // Hard limit: the recording finishes by itself and stays for review.
      limit.current = setTimeout(() => void stopRef.current(), chatLimits.voiceSeconds * 1000);
    } catch {
      setPhase('idle'); setChatAudio(false); restoreMode();
      setError('No se pudo usar el micrófono. Comprueba que ninguna otra app lo esté usando.');
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    if (live.current.phase !== 'recording') return;
    clearLimit(); live.current = {phase: 'review', clip: null};
    let duration = 0;
    try {duration = recorder.getStatus().durationMillis; await recorder.stop();} catch {/* already stopped */}
    setChatAudio(false); restoreMode();
    const uri = recorder.uri;
    if (!uri) {setPhase('idle'); setError('No se pudo guardar la grabación.'); return;}
    if (duration < 1000) {discard.current({uri, durationMs: duration}); setPhase('idle'); setError('La nota de voz es demasiado corta.'); return;}
    setClip({uri, durationMs: Math.min(duration, chatLimits.voiceSeconds * 1000)}); setPhase('review');
  }, [recorder]);

  const cancel = useCallback(async () => {
    const {phase: now, clip: kept} = live.current;
    clearLimit(); live.current = {phase: 'idle', clip: null};
    if (now === 'recording') {
      try {await recorder.stop();} catch {/* ignore */}
      setChatAudio(false); restoreMode();
      if (recorder.uri) discard.current({uri: recorder.uri, durationMs: 0});
    }
    if (kept) {if (useVoicePlayer.getState().id === 'local:' + kept.uri) stopVoice(); discard.current(kept);}
    setClip(null); setPhase('idle');
  }, [recorder]);

  /** Hands the clip to the composer (which then owns cleanup) and resets. */
  const take = useCallback(() => {
    const kept = live.current.clip;
    if (kept && useVoicePlayer.getState().id === 'local:' + kept.uri) stopVoice();
    setClip(null); setPhase('idle');
    return kept;
  }, []);

  useEffect(() => {stopRef.current = stop;}, [stop]);
  // Leaving the room or screen discards an unsent recording and releases the microphone.
  useEffect(() => () => {void cancel();}, [cancel]);

  return {phase, clip, error, clearError: () => setError(''), duration: status.durationMillis, start, stop, cancel, take};
}
