import {Platform, useColorScheme, type ViewStyle} from 'react-native';
import {createContext, createElement, useContext, type ReactNode} from 'react';
import { useLibrary } from './library';
export const tokens = {space: [0, 4, 8, 12, 16, 24, 32, 48], radius: {small: 12, card: 20, pill: 99}};
/** SDK 57 / RN 0.86 exposes gradients under the experimental native property; web uses CSS. */
export function gradientStyle(image: string, fallback = 'transparent'): ViewStyle {
  return Platform.OS === 'web' ? {backgroundImage: image, backgroundColor: fallback} as ViewStyle
    : {experimental_backgroundImage: image, backgroundColor: fallback};
}

export type Palette = {
  isDark: boolean; bg: string; surface: string; surfaceAlt: string; text: string; muted: string;
  primary: string; primaryText: string; onPrimary: string; accent: string; accentSoft: string; live: string; border: string;
  shadow: string; featured: string; featuredFallback: string; brand: string; headerGlow: string;
};

/** Colours taken from the ONDA logo: cyan #12D3E6 → blue #1478E0 → violet #6D3BEF. */
const light: Palette = {
  isDark: false, bg: '#F5F8FC', surface: '#FFFFFF', surfaceAlt: '#EAF1F8', text: '#0F1A35', muted: '#55657E',
  // primaryText keeps ≥4.5:1 on white; primary is used for fills with white text and icons.
  primary: '#0C98C8', primaryText: '#0A6E96', onPrimary: '#FFFFFF', accent: '#6D3BEF', accentSoft: '#EEE9FE',
  live: '#E5384F', border: '#E1E8F2',
  shadow: '0px 6px 18px rgba(15, 26, 53, 0.08)',
  featured: 'linear-gradient(120deg, #0B1B4D 0%, #1D3FA6 52%, #6B2FC9 100%)', featuredFallback: '#1A2C78',
  brand: 'linear-gradient(115deg, #087FAD 0%, #245CDD 48%, #783BFF 100%)',
  headerGlow: 'linear-gradient(180deg, #D8F3FA 0%, #EAF4FC 55%, #F5F8FC 100%)',
};
const dark: Palette = {
  isDark: true, bg: '#080E29', surface: '#111A3FEF', surfaceAlt: '#202856', text: '#FFFFFF', muted: '#B8C5E9',
  primary: '#11DDF4', primaryText: '#6AE9F7', onPrimary: '#FFFFFF', accent: '#B195FF', accentSoft: '#30235E',
  live: '#FF386B', border: '#434778',
  shadow: '0px 6px 18px rgba(0, 0, 0, 0.35)',
  featured: 'linear-gradient(120deg, #0E1E52 0%, #1F3C9C 52%, #6B2FC9 100%)', featuredFallback: '#1B2C70',
  brand: 'linear-gradient(115deg, #087FAD 0%, #245CDD 48%, #783BFF 100%)',
  headerGlow: 'linear-gradient(145deg, #101A4B 0%, #25105C 70%, #080E29 100%)',
};

export function useTheme(): Palette {
  const setting = useLibrary(s => s.theme); const system = useColorScheme();
  const scoped = useContext(ThemeContext);
  return scoped ?? (setting === 'soft' ? soft : ((setting === 'system' ? system : setting) === 'dark' ? dark : light));
}

export const soft: Palette = {...dark, bg: '#25344A', surface: '#304159', surfaceAlt: '#3A4D68',
  text: '#F5F8FC', muted: '#BDCADC', border: '#465B77', accentSoft: '#424164',
  primary: '#42D2E5', primaryText: '#83E5EF', onPrimary: '#102A39',
  shadow: '0px 8px 24px rgba(12, 23, 39, 0.14)',
  headerGlow: 'linear-gradient(180deg, #324F70 0%, #2B405B 55%, #25344A 100%)'};

export const cinemaPalette: Palette = {...dark, bg: '#080A10', surface: '#141720', surfaceAlt: '#1D212D',
  text: '#F8FAFF', muted: '#A8ADBD', border: '#272B38', accentSoft: '#27203F',
  headerGlow: 'linear-gradient(180deg, #17142B 0%, #080A10 100%)'};
const ThemeContext = createContext<Palette | null>(null);
export function ThemeScope({palette, children}: {palette?: Palette; children: ReactNode}) {
  return createElement(ThemeContext.Provider, {value: palette ?? null}, children);
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
