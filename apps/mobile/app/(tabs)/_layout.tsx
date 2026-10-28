import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '../../src/icons';
import { useTheme } from '../../src/theme';
import { Label, MiniPlayer } from '../../src/ui';
import {useDesktop} from '../../src/web/layout';
const items = {
  index: {icon: 'home', title: 'Inicio'}, world: {icon: 'earth', title: 'Mundo'}, radar: {icon: 'radio', title: 'Radar'},
  library: {icon: 'albums', title: 'Biblioteca'},
} as const;
export default function TabLayout() {
  const c = useTheme(); const desktop = useDesktop();
  return <Tabs screenOptions={{headerShown: false, sceneStyle: {backgroundColor: 'transparent'}}} tabBar={({state, navigation, insets}) => desktop ? null : <View style={{backgroundColor: c.bg, paddingBottom: Math.max(insets.bottom, 6)}}>
    <MiniPlayer/>
    <View accessibilityRole="tablist" style={{flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 6, backgroundColor: c.surface}}>
      {state.routes.map((route, index) => {
        const item = items[route.name as keyof typeof items]; const focused = state.index === index;
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{selected: focused}}
          onPress={() => {const e = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true}); if (!focused && !e.defaultPrevented) navigation.navigate(route.name);}}
          onLongPress={() => navigation.emit({type: 'tabLongPress', target: route.key})} style={{flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center'}}>
          <View style={{alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16, backgroundColor: focused ? c.primary + (c.isDark ? '2E' : '1A') : 'transparent'}}>
            <Ionicons name={focused ? item.icon : `${item.icon}-outline`} size={22} color={focused ? c.primaryText : c.muted}/>
            <Label style={{fontSize: 11, lineHeight: 14, color: focused ? c.primaryText : c.muted, fontWeight: focused ? '800' : '500'}}>{item.title}</Label>
          </View>
        </Pressable>;
      })}
    </View>
  </View>}>
    <Tabs.Screen name="index"/><Tabs.Screen name="world"/><Tabs.Screen name="radar"/><Tabs.Screen name="library"/>
  </Tabs>;
}
