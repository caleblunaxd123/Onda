import {expect, it, vi} from 'vitest';
import {receiveGlobe, type GlobeProps} from './globe-types';
it('accepts finite viewport messages and only station IDs actually present on the map', () => {
  const p: GlobeProps = {features: {type: 'FeatureCollection', features: [{type: 'Feature', properties: {stationId: 'saved'}, geometry: {type: 'Point', coordinates: [-77, -12]}}]}, selectedId: null,
    onViewport: vi.fn(), onSelect: vi.fn(), onReady: vi.fn(), onGroup: vi.fn(), onError: vi.fn()};
  receiveGlobe({type: 'select', id: 'https://untrusted.example'}, p); expect(p.onSelect).not.toHaveBeenCalled();
  receiveGlobe({type: 'select', id: 'saved'}, p); expect(p.onSelect).toHaveBeenCalledWith('saved');
  receiveGlobe({type: 'viewport', bounds: [0, 0, 10, NaN], zoom: 4}, p); expect(p.onViewport).not.toHaveBeenCalled();
  receiveGlobe({type: 'viewport', bounds: [-180, -85, 180, 85], zoom: 1}, p); expect(p.onViewport).toHaveBeenCalledOnce();
});
