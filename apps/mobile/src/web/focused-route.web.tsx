import type {PropsWithChildren} from 'react';
import {useIsFocused} from 'expo-router';

/** Keep a tab's scroll and query state without painting it behind transparent ONDA scenes. */
export function FocusedRoute({children}: PropsWithChildren) {
  const focused = useIsFocused();
  return <div style={{flex: 1, display: 'flex', minHeight: 0, flexDirection: 'column', visibility: focused ? 'visible' : 'hidden'}}>{children}</div>;
}
