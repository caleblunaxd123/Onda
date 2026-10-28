import {FocusedRoute} from '../../src/web/focused-route.web';
import MobileLibrary from '../../src/screens/library';
import DesktopLibrary from '../../src/web/library.web';
import {useDesktop} from '../../src/web/layout';
export default function LibraryWeb() {return <FocusedRoute>{useDesktop() ? <DesktopLibrary/> : <MobileLibrary/>}</FocusedRoute>;}
