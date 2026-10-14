

/** Emoji flag from an ISO country code (rendered by the system emoji font). */
export const flag = (code?: string) => code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65)) : '🌐';

export const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const formatCount = (n: number) => n.toLocaleString('es');

export const searchWords = (query: string) => [...new Set(fold(query).match(/[\p{L}\p{N}]+(?:[&'][\p{L}\p{N}]+)*/gu) ?? [])];
/** All words must match, in any order. Accents and joined station names are accepted. */
export const matchesText = (value: string, query: string) => {
  if (!query.trim()) return true;
  const words = searchWords(query);
  if (!words.length) return false;
  const text = fold(value);
  const compact = text.replace(/\s+/g, '');
  return words.every(word => text.includes(word) || compact.includes(word));
};

/** Spanish labels for the most common catalog genres; the API provides labels for facet lists. */
const genreLabels: Record<string, string> = {
  pop: 'Pop', rock: 'Rock', news: 'Noticias', talk: 'Hablada', music: 'Variada', classical: 'Clásica', jazz: 'Jazz', dance: 'Dance',
  electronic: 'Electrónica', oldies: 'Clásicos', '80s': 'Años 80', '90s': 'Años 90', '70s': 'Años 70', hits: 'Éxitos', 'top 40': 'Top 40',
  christian: 'Cristiana', religious: 'Religiosa', sports: 'Deportes', chillout: 'Chill out', ambient: 'Ambiental', romantic: 'Romántica',
  latin: 'Latina', salsa: 'Salsa', cumbia: 'Cumbia', reggaeton: 'Reguetón', folk: 'Folk', 'world music': 'Músicas del mundo', 'hip hop': 'Hip hop',
  country: 'Country', public: 'Pública', 'public radio': 'Radio pública', 'community radio': 'Comunitaria', culture: 'Cultura', information: 'Información',
  entertainment: 'Entretenimiento', alternative: 'Alternativa', indie: 'Indie', metal: 'Metal', house: 'House', techno: 'Techno', soul: 'Soul', blues: 'Blues',
};

export const tagLabel = (tag: string) => genreLabels[tag] ?? (tag.charAt(0).toUpperCase() + tag.slice(1));
