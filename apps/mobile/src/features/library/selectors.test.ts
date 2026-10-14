import {describe, expect, it} from 'vitest';
import {libraryCountries, libraryStations} from './selectors';
import {matchesText} from '../../format';
import type {Station} from '../../types';

const station = (id: string, name: string, country: string, countryCode: string, tags: string[]): Station => ({id, name, country, countryCode, tags, language: 'Español', streamUrl: 'https://example.com/'+id, artworkUrl: null, codec: 'MP3', bitrate: 128, votes: 0, latitude: null, longitude: null});
const rows = [station('a','Radio Oxígeno','Perú','PE',['rock']), station('b','LOS 40','España','ES',['pop']), station('c','Jazz Lima','Perú','PE',['jazz'])];

describe('library exploration', () => {
  it('searches all words across metadata, accepts accents and joined names', () => {
    expect(libraryStations(rows,'peru oxigeno','','saved').map(s=>s.id)).toEqual(['a']);
    expect(libraryStations(rows,'los40','','saved').map(s=>s.id)).toEqual(['b']);
    expect(libraryStations(rows,'jazz español','','saved').map(s=>s.id)).toEqual(['c']);
    expect(matchesText('Radio noticias','***')).toBe(false);
  });
  it('combines country and query while sorting without mutating saved order', () => {
    expect(libraryStations(rows,'','PE','name').map(s=>s.id)).toEqual(['c','a']);
    expect(libraryStations(rows,'pop','PE','name')).toEqual([]);
    expect(rows.map(s=>s.id)).toEqual(['a','b','c']);
    expect(libraryStations(rows,'','','country').map(s=>s.id)).toEqual(['b','c','a']);
  });
  it('shows real country counts from the selected library section', () => {
    expect(libraryCountries(rows)).toEqual([{value:'ES',label:'España',count:1},{value:'PE',label:'Perú',count:2}]);
    expect(libraryCountries([])).toEqual([]);
  });
});
