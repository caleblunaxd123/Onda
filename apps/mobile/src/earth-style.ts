import type {StyleSpecification} from 'maplibre-gl';
/** NASA Blue Marble is a composite image, not live satellite imagery or street-level photography. */
export const earthStyle: StyleSpecification = {
  version: 8, projection: {type: 'globe'},
  sources: {earth: {type: 'raster', tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
    tileSize: 256, maxzoom: 8, attribution: 'Imagery: NASA GIBS · Blue Marble'}},
  layers: [{id: 'space', type: 'background', paint: {'background-color': '#101B32'}},
    {id: 'earth', type: 'raster', source: 'earth', paint: {'raster-fade-duration': 200}}],
  sky: {'sky-color': '#122138', 'horizon-color': '#9BCDE3', 'fog-color': '#122138', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.8, 'fog-ground-blend': 0.4},
};
