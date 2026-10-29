import { useEffect, useState } from 'react';
import type { StyleSpecification } from 'maplibre-gl';

/**
 * Map style. Default: OpenFreeMap (OpenStreetMap data, no API key, attribution shown by the style).
 * Set EXPO_PUBLIC_MAP_STYLE to use another provider; review its terms and usage limits before release.
 */
export const mapStyle = (_dark: boolean) =>
  process.env.EXPO_PUBLIC_MAP_STYLE || 'https://tiles.openfreemap.org/styles/liberty';

/** Prefers the Spanish name (OSM `name:es`) in every label, falling back to the style's original expression. */
export function spanishLabels(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map(layer => {
      if (layer.type !== 'symbol' || !layer.layout?.['text-field']) return layer;
      const field = layer.layout['text-field'];
      if (!JSON.stringify(field).includes('name')) return layer;
      return {...layer, layout: {...layer.layout, 'text-field': ['coalesce', ['get', 'name:es'], field] as never}};
    }),
  };
}

/**
 * Spanish-labelled style JSON; falls back to the plain URL if it cannot be downloaded within 3.5 s.
 * Returns null while loading so the map is created once with its final style.
 */
export function useMapStyle(dark: boolean): string | StyleSpecification | null {
  const url = mapStyle(dark);
  const [style, setStyle] = useState<{url: string; value: string | StyleSpecification} | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const fallback = setTimeout(() => {controller.abort(); setStyle(current => current?.url === url ? current : {url, value: url});}, 3500);
    fetch(url, {signal: controller.signal}).then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((json: StyleSpecification) => setStyle({url, value: spanishLabels(json)}))
      .catch(() => setStyle(current => current?.url === url ? current : {url, value: url}))
      .finally(() => clearTimeout(fallback));
    return () => {clearTimeout(fallback); controller.abort();};
  }, [url]);
  return style && style.url === url ? style.value : null;
}
