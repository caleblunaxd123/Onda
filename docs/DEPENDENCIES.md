# Auditoría de dependencias — 2026-10-12

NuGet: sin paquetes vulnerables detectados por la auditoría ejecutada, incluidas transitivas.
El template inicial traía Microsoft.OpenApi 2.0.0 vulnerable; se actualizó a 2.12.2
y Microsoft.AspNetCore.OpenApi a 10.0.12.

npm audit después de npm audit fix: **29 paquetes señalados, 19 high y 10 moderate**.
La mayoría son propagaciones de estas cuatro dependencias:

- braces <=3.0.3: GHSA-vfj7-8cjw-p6xm; versión latest observada 3.0.3. Afecta cadena Metro.
- node-forge <=1.4.0: GHSA-86w9-cpqp-85rv; latest observada 1.4.0. Afecta herramientas/certificados Expo.
- uuid <11.1.1: GHSA-w5hq-g745-h8pq; transitiva de xcode.
- decode-uri-component <=0.4.2: GHSA-vcc3-ghjq-m6fr; transitiva de query-string/Expo Router.

No se ejecutó audit fix --force: propone degradar Expo a 44 y cambiar Router a otro SDK.
decode-uri-component 0.5 cambia a ESM mientras la dependencia actual usa require, por lo que
no se impuso un override sin compatibilidad demostrada. Tampoco se modificó node_modules manualmente.

Estado: pendiente de solución compatible y revisión de exposición antes de distribuir una beta pública.
No afirmar que la app está lista para producción ni que la auditoría está limpia.
Reproducir: npm --prefix apps/mobile audit; dotnet list backend/Onda.slnx package --vulnerable --include-transitive.

Referencias: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm,
https://github.com/advisories/GHSA-86w9-cpqp-85rv,
https://github.com/advisories/GHSA-w5hq-g745-h8pq,
https://github.com/advisories/GHSA-vcc3-ghjq-m6fr.
