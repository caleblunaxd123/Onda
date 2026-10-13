export type Station = {
  id: string; name: string; country: string; countryCode: string; language: string;
  tags: string[]; streamUrl: string; artworkUrl: string | null; codec: string;
  bitrate: number; votes: number; latitude: number | null; longitude: number | null;
};
export type PlaybackState = 'idle' | 'connecting' | 'buffering' | 'playing' | 'paused' | 'error';
