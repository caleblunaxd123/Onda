# Auditoría de dependencias — 2026-10-12 (actualizada)

NuGet: `dotnet list backend/Onda.slnx package --vulnerable --include-transitive` → sin paquetes vulnerables.
Nuevo paquete de pruebas: Xunit.SkippableFact 1.5.85 (omitir pruebas SQL cuando no hay servidor).

npm: **22 avisos (19 high, 3 moderate)**, antes 29. Se resolvió la cadena de `uuid` (GHSA-w5hq-g745-h8pq) con un
override acotado `"overrides": {"xcode": {"uuid": "^11.1.1"}}`: xcode usa `require('uuid').v4()` y uuid 11.1.1
mantiene salida CommonJS; se verificó la resolución y la generación de UUID. `npx expo install --check`: sin conflictos.

Pendientes, sin corrección compatible con Expo SDK 57:
- braces ≤3.0.3 (GHSA-vfj7-8cjw-p6xm): no existe versión corregida publicada; cadena de Metro (herramienta de desarrollo).
- node-forge ≤1.4.0 (GHSA-86w9-cpqp-85rv): no existe versión corregida; herramientas/certificados de Expo CLI.
- decode-uri-component ≤0.4.2 (GHSA-vcc3-ghjq-m6fr): la corrección exige expo-router 58 (otro SDK); 0.5 es solo ESM.
Los avisos «high» de react-native, reanimated, worklets, maplibre-react-native y expo son propagaciones de esas
cadenas en herramientas de compilación; npm propone degradar a Expo 44 / RN 0.72 con `--force`, lo que rompería el SDK.

No se ejecutó `npm audit fix --force` ni se modificó node_modules manualmente.
Estado: revisar de nuevo al actualizar a Expo SDK 58. No afirmar que la auditoría está limpia.
Reproducir: `npm --prefix apps/mobile audit`; `dotnet list backend/Onda.slnx package --vulnerable --include-transitive`.
