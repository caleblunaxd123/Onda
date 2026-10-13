import { expect, it } from 'vitest';
import { detectCountry } from './region';

it('detects the country from the device time zone before the language region', () => {
  expect(detectCountry('America/Lima', 'en-US')).toEqual({code: 'PE', source: 'timezone'});
  expect(detectCountry('Europe/Madrid', 'es-MX')).toEqual({code: 'ES', source: 'timezone'});
  expect(detectCountry('America/Buenos_Aires', 'es')).toEqual({code: 'AR', source: 'timezone'});
});
it('falls back to the locale region and never invents a country', () => {
  expect(detectCountry('UTC', 'es-CL')).toEqual({code: 'CL', source: 'locale'});
  expect(detectCountry('Etc/GMT', 'es')).toBeNull();
  expect(detectCountry(undefined, undefined)).toBeNull();
});
