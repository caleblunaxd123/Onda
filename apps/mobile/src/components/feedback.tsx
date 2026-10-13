import type {PropsWithChildren} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {Ionicons} from '../icons';
import {useTheme} from '../theme';
import {formatCount} from '../format';
import {Card, Label, Muted} from './primitives';
import {Button} from './controls';
import type {IconName} from './types';

export function Loading({rows = 3, label = 'Cargando emisoras'}: {rows?: number; label?: string}) {
  const c = useTheme();
  return <View accessibilityLabel={label} accessibilityRole="progressbar" style={{gap: 14, paddingVertical: 8}}>
    {label !== 'Cargando emisoras' && <Muted>{label}</Muted>}
    {Array.from({length: rows}, (_, k) => <View key={k} style={{flexDirection: 'row', gap: 12, alignItems: 'center'}}><View style={{width: 50, height: 50, borderRadius: 14, backgroundColor: c.surfaceAlt}}/><View style={{flex: 1, gap: 8}}><View style={{height: 12, width: '70%', borderRadius: 6, backgroundColor: c.surfaceAlt}}/><View style={{height: 10, width: '40%', borderRadius: 6, backgroundColor: c.surfaceAlt}}/></View></View>)}
  </View>;
}

export function Message({title, body, retry, icon = 'cloud-offline-outline'}: {title: string; body: string; retry?: () => void; icon?: IconName}) {
  const c = useTheme();
  return <Card style={{alignItems: 'flex-start'}}><View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}><Ionicons name={icon} size={22} color={c.primaryText}/><Label style={{fontSize: 17, fontWeight: '700', flex: 1}}>{title}</Label></View><Muted style={{fontSize: 14, lineHeight: 20}}>{body}</Muted>{retry && <Button title="Reintentar" icon="refresh" onPress={retry}/>}</Card>;
}

export function EmptyState({icon, title, body, children}: PropsWithChildren<{icon: IconName; title: string; body: string}>) {
  const c = useTheme();
  return <View style={{alignItems: 'center', paddingVertical: 28, gap: 12}}><View style={{backgroundColor: c.primary + '16', padding: 22, borderRadius: 99}}><Ionicons name={icon} size={34} color={c.primaryText}/></View><Label style={{fontSize: 19, fontWeight: '800', textAlign: 'center'}}>{title}</Label><Muted style={{fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300}}>{body}</Muted>{children}</View>;
}

/** Footer for progressive lists: loading, retry, end of results or in-memory limit. */
export function ListFooter({feed, endLabel = 'Has llegado al final de la lista.'}: {feed: {isFetchingNextPage: boolean; hasNextPage: boolean; isFetchNextPageError: boolean; capped: boolean; items: unknown[]; loadMore: () => void; fetchNextPage: () => unknown}; endLabel?: string}) {
  const c = useTheme();
  if (feed.isFetchingNextPage) return <View style={{padding: 18}}><ActivityIndicator color={c.primary} accessibilityLabel="Cargando más emisoras"/></View>;
  if (feed.isFetchNextPageError) return <View style={{padding: 12, alignItems: 'center', gap: 8}}><Muted>No se pudieron cargar más emisoras.</Muted><Button title="Reintentar" icon="refresh" secondary onPress={() => void feed.fetchNextPage()}/></View>;
  if (feed.capped) return <Muted style={{padding: 18, textAlign: 'center'}}>Mostrando {formatCount(feed.items.length)} emisoras. Usa los filtros para afinar la búsqueda.</Muted>;
  if (feed.hasNextPage) return <View style={{padding: 12, alignItems: 'center'}}><Button title="Cargar más" secondary onPress={feed.loadMore}/></View>;
  return feed.items.length > 0 ? <Muted style={{padding: 18, textAlign: 'center'}}>{endLabel}</Muted> : null;
}
