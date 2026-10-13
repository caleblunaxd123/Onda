import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import type { Station } from './types';
const base = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? 'http://localhost:5080' : 'http://10.0.2.2:5080');
export function useStations(filters: {q?: string; country?: string; tag?: string; language?: string; offset?: number} = {}) {
  return useQuery({
    queryKey: ['stations', filters],
    queryFn: async ({signal}): Promise<{items: Station[]; offset: number; limit: number}> => {
      const query = new URLSearchParams({limit: '30'});
      Object.entries(filters).forEach(([key, value]) => {if(value !== undefined && value !== '') query.set(key, String(value));});
      const response = await fetch(base + '/api/v1/stations?' + query, {signal});
      if (!response.ok) throw new Error(response.status === 503 ? 'El catálogo está temporalmente fuera de servicio.' : 'No se pudo cargar el catálogo.');
      return response.json();
    }, staleTime: 300_000, retry: 1,
  });
}
