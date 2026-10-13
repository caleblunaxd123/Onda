import { useColorScheme } from 'react-native';
import { useLibrary } from './library';
export const tokens = {space: [0, 4, 8, 12, 16, 24, 32, 48], radius: {small: 12, card: 20, pill: 99}};

export type Palette = {
  isDark: boolean; bg: string; surface: string; surfaceAlt: string; text: string; muted: string;
  primary: string; primaryText: string; onPrimary: string; accent: string; live: string; border: string;
  shadow: string; featured: string; featuredFallback: string;
};

const light: Palette = {
  isDark: false, bg: '#F5F7FB', surface: '#FFFFFF', surfaceAlt: '#EDF2F8', text: '#101A33', muted: '#56667F',
  // primaryText keeps ≥4.5:1 on white; primary is used for fills with white text and icons.
  primary: '#0E9AA8', primaryText: '#0A7A86', onPrimary: '#FFFFFF', accent: '#6F52E3', live: '#E5384F', border: '#E2E8F1',
  shadow: '0px 6px 18px rgba(16, 26, 51, 0.08)',
  featured: 'linear-gradient(120deg, #101B44 0%, #2C2A78 55%, #7A2F7E 100%)', featuredFallback: '#1B2257',
};
const dark: Palette = {
  isDark: true, bg: '#0B1326', surface: '#152241', surfaceAlt: '#1C2B4D', text: '#F5F8FF', muted: '#A8BAD1',
  primary: '#2DD4CF', primaryText: '#4FE0DB', onPrimary: '#05232A', accent: '#9B87FF', live: '#FF5C74', border: '#26375A',
  shadow: '0px 6px 18px rgba(0, 0, 0, 0.35)',
  featured: 'linear-gradient(120deg, #13204A 0%, #33287A 55%, #7A2F7E 100%)', featuredFallback: '#1E2659',
};

export function useTheme(): Palette {
  const setting = useLibrary(s => s.theme); const system = useColorScheme();
  return (setting === 'system' ? system : setting) === 'dark' ? dark : light;
}

/** Mood palette from the owner's reference: soft tinted tiles with a saturated icon. */
export const moods = [
  {name: 'Relajarme', tag: 'chillout', icon: 'leaf', color: '#27A86B'},
  {name: 'Concentrarme', tag: 'ambient', icon: 'headset', color: '#7A5AF0'},
  {name: 'Energía', tag: 'dance', icon: 'flash', color: '#E58A13'},
  {name: 'Romántico', tag: 'romantic', icon: 'heart', color: '#E5487E'},
  {name: 'Nostalgia', tag: 'oldies', icon: 'disc', color: '#1E9DB5'},
  {name: 'Noticias', tag: 'news', icon: 'newspaper', color: '#6C63E8'},
  {name: 'Deportes', tag: 'sports', icon: 'football', color: '#3F9E3A'},
  {name: 'Descubrir', tag: 'world music', icon: 'planet', color: '#2E86E8'},
] as const;

/** Greeting from the device's local time: 05–11 días, 12–18 tardes, otherwise noches. */
export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return {text: 'Buenos días', icon: 'sunny' as const};
  if (hour >= 12 && hour < 19) return {text: 'Buenas tardes', icon: 'partly-sunny' as const};
  return {text: 'Buenas noches', icon: 'moon' as const};
}
