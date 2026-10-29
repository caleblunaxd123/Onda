import type {StyleSpecification, SymbolLayerSpecification} from 'maplibre-gl';

/** Country names remain readable on imagery; smaller countries appear as the person zooms in. */
const countryLabels = ([{rank: 3, minzoom: 2}, {rank: 2, minzoom: 1}, {rank: 1, minzoom: 0}]).map(({rank, minzoom}): SymbolLayerSpecification => ({
  id: `earth-country-${rank}`, type: 'symbol', source: 'country-names', 'source-layer': 'place', minzoom, maxzoom: 10,
  filter: ['all', ['==', ['get', 'class'], 'country'], [rank === 3 ? '>=' : '==', ['coalesce', ['get', 'rank'], 3], rank]],
  layout: {'text-field': ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name']],
    'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 0, 10, 3, 12, 6, 16],
    'text-max-width': 7, 'text-letter-spacing': 0.04, 'text-padding': 5, 'text-allow-overlap': false},
  paint: {'text-color': '#F4F8FF', 'text-halo-color': '#102039', 'text-halo-width': 1.4, 'text-halo-blur': 0.6},
}));
/** NASA Blue Marble is a composite image, not live satellite imagery or street-level photography. */
export const earthStyle: StyleSpecification = {
  version: 8, projection: {type: 'globe'},
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {earth: {type: 'raster', tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
    tileSize: 256, maxzoom: 8, attribution: 'Imagery: NASA GIBS · Blue Marble'},
    'country-names': {type: 'vector', url: 'https://tiles.openfreemap.org/planet', maxzoom: 5}},
  layers: [{id: 'space', type: 'background', paint: {'background-color': '#101B32'}},
    {id: 'earth', type: 'raster', source: 'earth', paint: {'raster-fade-duration': 200}}, ...countryLabels],
  sky: {'sky-color': '#122138', 'horizon-color': '#9BCDE3', 'fog-color': '#122138', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.8, 'fog-ground-blend': 0.4},
};
