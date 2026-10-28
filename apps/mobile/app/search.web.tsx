import {FocusedRoute} from '../src/web/focused-route.web';
import {useLocalSearchParams} from 'expo-router';
import MobileSearch from '../src/screens/search';
import DesktopSearch from '../src/web/search.web';
import {useDesktop} from '../src/web/layout';
export default function SearchWeb() {
  const desktop = useDesktop(); const params = useLocalSearchParams<{q?: string; country?: string; tag?: string}>();
  return <FocusedRoute>{desktop ? <DesktopSearch key={[params.q, params.country, params.tag].join('|')}/> : <MobileSearch/>}</FocusedRoute>;
}
