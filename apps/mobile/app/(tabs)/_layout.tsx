import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '../../src/icons';
import { gradientStyle, useTheme } from '../../src/theme';
import { Label, MiniPlayer } from '../../src/ui';
const items = {
  index: {icon: 'home', title: 'Inicio'}, radio: {icon: 'radio', title: 'Radio'}, world: {icon: 'earth', title: 'Mundo'}, radar: {icon: 'compass', title: 'Radar'},
  library: {icon: 'albums', title: 'Biblioteca'},
} as const;
export default function TabLayout() {
  const c = useTheme();
  return <Tabs screenOptions={{headerShown: false, sceneStyle: {backgroundColor: 'transparent'}}} tabBar={({state, navigation, insets}) => <View style={{backgroundColor: c.surface, paddingBottom: Math.max(insets.bottom, 6), borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: c.border}}>
    <MiniPlayer/>
    <View accessibilityRole="tablist" style={{flexDirection: 'row', paddingTop: 6}}>
      {state.routes.map((route, index) => {
        const item = items[route.name as keyof typeof items]; const focused = state.index === index;
        if (!item) return null;
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{selected: focused}}
          onPress={() => {const e = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true}); if (!focused && !e.defaultPrevented) navigation.navigate(route.name);}}
          onLongPress={() => navigation.emit({type: 'tabLongPress', target: route.key})} style={{flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center'}}>
          <View style={{alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2, maxWidth: '100%', paddingVertical: 5, borderRadius: 16, backgroundColor: focused ? c.primary + (c.isDark ? '18' : '1A') : 'transparent'}}>
            <Ionicons name={focused ? item.icon : `${item.icon}-outline`} size={22} color={focused ? c.primaryText : c.muted}/>
            <Label numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8} style={{fontSize: 11, lineHeight: 14, textAlign: 'center', color: focused ? c.primaryText : c.muted, fontWeight: focused ? '800' : '500'}}>{item.title}</Label>
            {focused && <View style={{height: 2, width: 22, borderRadius: 1, ...gradientStyle(c.brand, c.primary)}}/>}
          </View>
        </Pressable>;
      })}
    </View>
  </View>}>
    <Tabs.Screen name="index"/><Tabs.Screen name="radio"/><Tabs.Screen name="world"/><Tabs.Screen name="radar"/><Tabs.Screen name="library"/><Tabs.Screen name="rooms" options={{href: null}}/>
  </Tabs>;
}
