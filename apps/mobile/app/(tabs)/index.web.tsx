import {FocusedRoute} from '../../src/web/focused-route.web';
import MobileHome from '../../src/screens/home';
import DesktopHome from '../../src/web/home.web';
import {useDesktop} from '../../src/web/layout';
export default function HomeWeb() {return <FocusedRoute>{useDesktop() ? <DesktopHome/> : <MobileHome/>}</FocusedRoute>;}
