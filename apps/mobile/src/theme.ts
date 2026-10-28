import { Platform, useColorScheme, type ViewStyle } from 'react-native';
import { useLibrary } from './library';
export const tokens = {space: [0, 4, 8, 12, 16, 24, 32, 48], radius: {small: 12, card: 20, pill: 99}};

export type Palette = {
  immersive: boolean;
  isDark: boolean; bg: string; surface: string; surfaceAlt: string; text: string; muted: string;
  primary: string; primaryText: string; onPrimary: string; accent: string; accentSoft: string; live: string; border: string;
  shadow: string; featured: string; featuredFallback: string; brand: string; headerGlow: string;
};

/** Colours taken from the ONDA logo: cyan #12D3E6 → blue #1478E0 → violet #6D3BEF. */
const light: Palette = {
  immersive: false,
  isDark: false, bg: '#F5F8FC', surface: '#FFFFFF', surfaceAlt: '#EAF1F8', text: '#0F1A35', muted: '#55657E',
  // primaryText keeps ≥4.5:1 on white; primary is used for fills with white text and icons.
  primary: '#0C98C8', primaryText: '#0A6E96', onPrimary: '#FFFFFF', accent: '#6D3BEF', accentSoft: '#EEE9FE',
  live: '#E5384F', border: '#E1E8F2',
  shadow: '0px 6px 18px rgba(15, 26, 53, 0.08)',
  featured: 'linear-gradient(120deg, #0B1B4D 0%, #1D3FA6 52%, #6B2FC9 100%)', featuredFallback: '#1A2C78',
  brand: 'linear-gradient(135deg, #12D3E6 0%, #1478E0 62%, #6D3BEF 100%)',
  headerGlow: 'linear-gradient(180deg, #D8F3FA 0%, #EAF4FC 55%, #F5F8FC 100%)',
};
const dark: Palette = {
  immersive: false,
  isDark: true, bg: '#0A1226', surface: '#142240', surfaceAlt: '#1B2B4C', text: '#F4F8FF', muted: '#A6B8D0',
  primary: '#22CBE8', primaryText: '#5EDDF2', onPrimary: '#04202B', accent: '#A78BFA', accentSoft: '#2A2453',
  live: '#FF5C74', border: '#24365A',
  shadow: '0px 6px 18px rgba(0, 0, 0, 0.35)',
  featured: 'linear-gradient(120deg, #0E1E52 0%, #1F3C9C 52%, #6B2FC9 100%)', featuredFallback: '#1B2C70',
  brand: 'linear-gradient(135deg, #12D3E6 0%, #1478E0 62%, #6D3BEF 100%)',
  headerGlow: 'linear-gradient(180deg, #102A52 0%, #0D1A36 60%, #0A1226 100%)',
};

const immersive: Palette = {...dark, immersive: true, bg: '#080F28', surface: '#141D40F2', surfaceAlt: '#242B55',
  text: '#F7FAFF', muted: '#B4C3E2', primary: '#22D4EC', primaryText: '#76E6F5', onPrimary: '#08223B',
  accent: '#B19BFF', accentSoft: '#2D2554', border: '#36436A',
  shadow: '0px 8px 24px rgba(2, 6, 25, 0.22)',
  headerGlow: 'linear-gradient(120deg, #102550B8 0%, #26205AA0 65%, #12163D00 100%)',
  featured: 'linear-gradient(120deg, #073E68 0%, #253EB2 50%, #6B30CB 100%)',
  brand: 'linear-gradient(115deg, #0FAFC8 0%, #2674F5 52%, #8045F4 100%)'};

export function gradientStyle(image: string, fallback = 'transparent'): ViewStyle {
  return Platform.OS === 'web' ? {backgroundImage: image, backgroundColor: fallback} as ViewStyle
    : {experimental_backgroundImage: image, backgroundColor: fallback};
}

export function useTheme(): Palette {
  const setting = useLibrary(s => s.theme); const system = useColorScheme();
  return setting === 'immersive' ? immersive : (setting === 'system' ? system : setting) === 'dark' ? dark : light;
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
