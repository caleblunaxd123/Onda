export type SavedCollection = {id: string; name: string; stations: string[]};
export type SavedMediaBookmark = {id: string; kind: 'youtube' | 'audio' | 'video'; url: string; title: string; category?: string};
export type SavedLibrary = {favorites: string[]; history: string[] | null; collections: SavedCollection[]; media?: SavedMediaBookmark[] | null};
export type LibraryEnvelope = {version: number; library: SavedLibrary; updatedAt: string | null};
export const emptySaved: SavedLibrary = {favorites: [], history: null, collections: []};
const unique = (items: string[], limit: number) => [...new Set(items)].slice(0, limit);
/** Three-way merge: removals of saved items propagate; new items from either device survive. */
export function mergeIds(base: string[], local: string[], remote: string[], limit = 500) {
  const before = new Set(base); const here = new Set(local); const there = new Set(remote);
  return unique([...local, ...remote].filter(id => !before.has(id) || here.has(id) && there.has(id)), limit);
}
export function mergeSaved(base: SavedLibrary, local: SavedLibrary, remote: SavedLibrary): SavedLibrary {
  const ids = mergeIds(base.collections.map(x => x.id), local.collections.map(x => x.id), remote.collections.map(x => x.id), 50);
  const map = (items: SavedCollection[]) => new Map(items.map(x => [x.id, x]));
  const b = map(base.collections); const l = map(local.collections); const r = map(remote.collections);
  const media = [...(local.media ?? []), ...(remote.media ?? [])];
  const mediaIds = new Set(mergeIds((base.media ?? []).map(x => x.id), (local.media ?? []).map(x => x.id), (remote.media ?? []).map(x => x.id), 100));
  const mediaUrls = new Set<string>();
  return {
    favorites: mergeIds(base.favorites, local.favorites, remote.favorites),
    history: local.history === null ? null : unique([...(local.history ?? []), ...(remote.history ?? [])], 100),
    media: media.filter(x => {if (!mediaIds.has(x.id) || mediaUrls.has(x.url)) return false; mediaUrls.add(x.url); return true;}),
    collections: ids.map(id => {
      const here = l.get(id); const there = r.get(id); const before = b.get(id);
      return {id, name: here && (!before || here.name !== before.name) ? here.name : there?.name ?? here!.name,
        stations: here && there ? mergeIds(before?.stations ?? [], here.stations, there.stations) : (here ?? there)!.stations};
    }),
  };
}
