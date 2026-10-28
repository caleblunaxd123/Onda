import {FocusedRoute} from '../../src/web/focused-route.web';
import MobileRadar from '../../src/screens/radar';
import DesktopRadar from '../../src/web/radar.web';
import {useDesktop} from '../../src/web/layout';
export default function RadarWeb() {return <FocusedRoute>{useDesktop() ? <DesktopRadar/> : <MobileRadar/>}</FocusedRoute>;}
