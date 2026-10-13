import zones from './data/timezones.json';

export type DetectedCountry = {code: string; source: 'timezone' | 'locale'};

/**
 * Country where the device is, without location permission: the IANA time zone (tzdb zone.tab, public domain)
 * reflects where the person is; the locale region (es-PE) is only a fallback because it reflects language settings.
 */
export function detectCountry(timeZone?: string, locale?: string): DetectedCountry | null {
  const byZone = timeZone ? (zones as Record<string, string>)[timeZone] : undefined;
  if (byZone) return {code: byZone, source: 'timezone'};
  const region = locale?.match(/[-_]([A-Z]{2})\b/)?.[1];
  return region ? {code: region, source: 'locale'} : null;
}

export function deviceCountry(): DetectedCountry | null {
  try {
    const options = Intl.DateTimeFormat().resolvedOptions();
    return detectCountry(options.timeZone, options.locale);
  } catch {return null;}
}
