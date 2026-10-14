import {describe, expect, it} from 'vitest';
import {emptySaved, mergeIds, mergeSaved} from './merge';
describe('cloud library reconciliation', () => {
  it('propagates removals and keeps independent additions from both devices', () => {
    expect(mergeIds(['a', 'b'], ['b', 'local'], ['a', 'b', 'remote'])).toEqual(['b', 'local', 'remote']);
    expect(mergeIds(['a'], ['a'], [])).toEqual([]);
    expect(mergeIds([], ['a'], [])).toEqual(['a']);
  });
  it('merges first sync without losing local or cloud favorites', () => {
    expect(mergeSaved(emptySaved, {...emptySaved, favorites: ['local']}, {...emptySaved, favorites: ['cloud']}).favorites).toEqual(['local', 'cloud']);
  });
  it('propagates collection deletion, combines station edits and preserves remote rename', () => {
    const base = {...emptySaved, collections: [{id: 'c', name: 'Antes', stations: ['a', 'b']}, {id: 'deleted', name: 'Borrar', stations: []}]};
    const local = {...emptySaved, collections: [{id: 'c', name: 'Antes', stations: ['b', 'local']}]};
    const remote = {...emptySaved, collections: [{id: 'c', name: 'Después', stations: ['a', 'b', 'remote']}, base.collections[1]]};
    expect(mergeSaved(base, local, remote).collections).toEqual([{id: 'c', name: 'Después', stations: ['b', 'local', 'remote']}]);
  });
  it('keeps history private unless explicitly included and bounds all lists', () => {
    expect(mergeSaved(emptySaved, emptySaved, {...emptySaved, history: ['private']}).history).toBeNull();
    expect(mergeIds([], Array.from({length: 600}, (_, i) => String(i)), [])).toHaveLength(500);
  });
  it('replays edits made during a request without dropping remotely added items', () => {
    const local = {...emptySaved, favorites: ['a']};
    const synced = {...emptySaved, favorites: ['a', 'cloud']};
    const edited = {...emptySaved, favorites: ['late']};
    expect(mergeSaved(local, edited, synced).favorites).toEqual(['late', 'cloud']);
  });
});
