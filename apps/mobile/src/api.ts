import { Platform } from 'react-native';

export const apiBase = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? 'http://localhost:5080' : 'http://10.0.2.2:5080');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {super(message);}
}

const messages: Record<number, string> = {
  0: 'Sin conexión con ONDA. Revisa tu internet e inténtalo de nuevo.',
  408: 'El catálogo tardó demasiado en responder. Inténtalo de nuevo.',
  429: 'Demasiadas consultas seguidas. Espera unos segundos.',
  503: 'El catálogo de radios no está disponible ahora mismo.',
};

/** Fetch with a hard timeout that also honours the caller's AbortSignal (TanStack Query cancellation). */
export async function request<T>(path: string, {signal, timeoutMs = 15000, method = 'GET', body}: {signal?: AbortSignal; timeoutMs?: number; method?: 'GET' | 'POST'; body?: unknown} = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {timedOut = true; controller.abort();}, timeoutMs);
  const forward = () => controller.abort();
  signal?.addEventListener('abort', forward);
  try {
    const response = await fetch(apiBase + path, {
      method, signal: controller.signal,
      headers: body ? {'Content-Type': 'application/json'} : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      let detail = '';
      try {detail = ((await response.json()) as {detail?: string}).detail ?? '';} catch {/* not JSON */}
      throw new ApiError(messages[response.status] ?? (detail || 'No se pudo completar la solicitud.'), response.status);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError(messages[408], 408);
    if (signal?.aborted) throw error;
    throw new ApiError(messages[0], 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forward);
  }
}

export const query = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {if (value !== undefined && value !== null && value !== '') search.set(key, String(value));});
  return search.toString();
};
