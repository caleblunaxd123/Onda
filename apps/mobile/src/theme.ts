import { useColorScheme } from 'react-native';
import { useLibrary } from './library';
export const tokens = {space: [0,4,8,12,16,24,32,48], radius: {small:12, card:24, pill:99}};
const dark = {bg:'#0B1326', surface:'#172644', text:'#F5F8FF', muted:'#A8BAD1', primary:'#29D3CF', accent:'#8769F6', live:'#FF667C', border:'#293A59'};
const light = {bg:'#F7FAFF', surface:'#FFFFFF', text:'#14213C', muted:'#52657E', primary:'#159FAD', accent:'#7254D8', live:'#B82C49', border:'#DAE3F0'};
export function useTheme() {
 const setting = useLibrary(s => s.theme); const system = useColorScheme();
 return (setting === 'system' ? system : setting) === 'light' ? light : dark;
}
