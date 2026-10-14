/**
 * Shared-playback sync rules. The server's room state is canonical (position + server timestamp + revision);
 * clients project it with a measured clock offset and correct their own player. Pure and unit tested.
 */

/** Thresholds are configuration, validated with real devices — not universal constants. */
export type SyncConfig = {
  /** Below this drift (s) nothing is done. */
  tolerance: number;
  /** Above this drift (s) the player seeks. Between tolerance and this, players that support it change speed. */
  seekThreshold: number;
  /** Maximum speed change for progressive correction (0.05 = ±5 %). */
  maxRateDelta: number;
  /** Seconds over which a progressive correction should absorb the drift. */
  correctionWindow: number;
};
export const defaultSyncConfig: SyncConfig = {tolerance: 0.5, seekThreshold: 3, maxRateDelta: 0.05, correctionWindow: 10};

export type PlayerCapabilities = {seek: boolean; rate: boolean; remoteControl: boolean};
export type Correction = {action: 'none'} | {action: 'seek'; target: number} | {action: 'rate'; rate: number};

/** Where the canonical state says playback should be now, in server time. */
export function expectedPosition(state: {positionSeconds: number; isPlaying: boolean; updatedAtMs: number}, serverNowMs: number) {
  return Math.max(0, state.positionSeconds + (state.isPlaying ? Math.max(0, serverNowMs - state.updatedAtMs) / 1000 : 0));
}

/**
 * Decides the local correction for a drift. Small drifts on players with variable speed are absorbed by
 * temporarily speeding up or slowing down (no audible jump); large drifts, or players without speed control, seek.
 */
export function correction(expected: number, actual: number, capabilities: PlayerCapabilities, config: SyncConfig = defaultSyncConfig, playing = true): Correction {
  if (!Number.isFinite(expected) || !Number.isFinite(actual) || !capabilities.remoteControl) return {action: 'none'};
  const drift = expected - actual; // positive: we are behind
  const size = Math.abs(drift);
  if (size <= config.tolerance) return capabilities.rate && playing ? {action: 'rate', rate: 1} : {action: 'none'};
  // Without speed control, seeking for every small drift would rebuffer constantly: only large drifts seek.
  if (!capabilities.rate) return size > config.seekThreshold && capabilities.seek ? {action: 'seek', target: Math.max(0, expected)} : {action: 'none'};
  if (size > config.seekThreshold || !playing) return capabilities.seek ? {action: 'seek', target: Math.max(0, expected)} : {action: 'none'};
  const delta = Math.max(-config.maxRateDelta, Math.min(config.maxRateDelta, drift / config.correctionWindow));
  return {action: 'rate', rate: Math.round((1 + delta) * 1000) / 1000};
}

export type ClockSample = {sentMs: number; serverMs: number; receivedMs: number};
/**
 * NTP-style estimate: offset = server time − local midpoint. The sample with the lowest round trip is the most
 * trustworthy, because asymmetric network delay is bounded by half its RTT.
 */
export function estimateClock(samples: ClockSample[]) {
  const valid = samples.filter(x => x.receivedMs >= x.sentMs && Number.isFinite(x.serverMs));
  if (!valid.length) return null;
  const best = valid.reduce((a, b) => (b.receivedMs - b.sentMs < a.receivedMs - a.sentMs ? b : a));
  const rtt = best.receivedMs - best.sentMs;
  return {offsetMs: best.serverMs - (best.sentMs + best.receivedMs) / 2, rttMs: rtt, uncertaintyMs: rtt / 2};
}
