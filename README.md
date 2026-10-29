# ONDA
**El mundo suena aquí.**

Aplicación móvil de radios con Expo / React Native (SDK 57) y API ASP.NET Core 10.
Base de datos: **SQL Server**, por decisión del propietario.
Estado: **beta 0.7.3 de radios publicada en Contabo y Cloudflare**. Artefactos web/APK y API verificados; apertura fría del widget en teléfono y preparación de Google Play pendientes.

Web: https://onda.lunalav.pe · [APK Android 0.7.3](https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.7.3&build=14.1).
Actualiza la beta anterior conservando la biblioteca; no requiere Metro. Firma beta, todavía no de tiendas.
[Despliegue y rollback](docs/DEPLOYMENT.md) · [Preparación de Play Store](docs/PLAY_STORE_READINESS.md).

## Enfoque
Solo radios mundiales: escuchar, buscar, explorar el mapa y guardar favoritos.
El inicio abre directamente y destaca las radios del país de escucha, sugerido por zona horaria/idioma
o elegido en Ajustes, sin GPS. Incluye acceso rápido a favoritas e historial y después descubrimiento
mundial. Sin salas, chat ni IA.

## Qué incluye
- Catálogo de Radio Browser sincronizado en SQL Server: 69.768 registradas y 36.757 variantes HTTPS disponibles
  en 220 países al publicar el 2026-10-28 (el catálogo y la disponibilidad cambian),
  con paginación por cursor, recuentos reales, variantes y fuentes alternativas, y disponibilidad sin falsas «caídas».
- Inicio con radios del país, favoritas y descubrimiento mundial; búsqueda con filtros
  (país, ciudad, idioma, género), globo terráqueo NASA con puntos pequeños y vista de calles, Radio Radar con carga progresiva,
  reproductor global con reintentos y fuentes alternativas, reportes de problemas, biblioteca local con colecciones.
- Diseño Inmersivo ONDA con ondas cian, azul y violeta; también claro, oscuro y automático.
  Web de escritorio desde 1000 px: menú lateral, emisoras en columnas, mapa amplio y reproductor fijo
  con volumen/temporizador. Móvil conserva navegación táctil. Capturas: docs/screenshots.
- Título publicado por emisoras ICY compatibles en reproductor y barra inferior; canción, estación
  y logo en controles multimedia del sistema. [Compatibilidad y límites](docs/NOW_PLAYING.md).
- Respaldo portátil de favoritas/colecciones y widget Android con las tres primeras favoritas.
  [Funcionamiento, privacidad y límites](docs/LIBRARY_BACKUP_AND_GLOBE.md). Sin sincronización automática ni cuentas.
- Reconocimiento musical de audio todavía no implementado; sí metadatos ICY cuando existen.

## Inicio en Windows
Requisitos: Node 22+, .NET SDK 10 (se usa `.tools/dotnet` si existe), SQL Server (por defecto `.\SQLEXPRESS`,
autenticación Windows), JDK 17 y Android SDK para compilar Android. Usar Development Build para probar los módulos locales de widget y guardado Android.

1. `npm --prefix apps/mobile ci`
2. `powershell -ExecutionPolicy Bypass -File scripts/init-db.ps1` (crea y migra la base `Onda`)
3. `powershell -ExecutionPolicy Bypass -File scripts/start-api.ps1` (o `start-web-api.ps1` solo localhost).
   La primera sincronización completa del catálogo empieza a los 15 s y tarda unos minutos;
   mientras tanto la API consulta Radio Browser en vivo.
4. Opcional: copiar `apps/mobile/.env.example` a `apps/mobile/.env`.
5. En `apps/mobile`: `$env:APP_VARIANT='development'; npm run android` (compila e instala el Development Build).
6. En siguientes sesiones: `npm run mobile` y abrir la app instalada.

Otra instancia: `$env:ONDA_SQL_SERVER='(localdb)\OndaDev'` o `$env:ConnectionStrings__Onda='...'` antes de los scripts.
En emulador Android la API está en `http://10.0.2.2:5080`; en un dispositivo físico, la IP LAN del PC.
El tráfico HTTP solo se habilita en builds con APP_VARIANT=development. Preview/producción requieren API HTTPS.

## Probar en un teléfono Android real (APK de prueba en la red local)
1. PC y teléfono en la misma red Wi‑Fi/LAN. Iniciar la API para la red: `scripts/start-api.ps1` (escucha en 0.0.0.0:5080).
2. Permitir el puerto 5080 en el firewall de Windows (una vez, PowerShell como administrador):
   `New-NetFirewallRule -DisplayName "ONDA API 5080 (LAN)" -Direction Inbound -Protocol TCP -LocalPort 5080 -RemoteAddress LocalSubnet -Action Allow`
3. Generar el APK con la IP LAN del PC (ejemplo 192.168.18.12):
   `powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1 -ApiUrl http://192.168.18.12:5080`
   Resultado: `dist/ONDA-<versión>-lan.apk` (firmado con la clave de depuración; solo para pruebas).
4. Copiar el APK al teléfono, permitir «Instalar apps desconocidas» y abrirlo. Desde el navegador del teléfono,
   `http://<IP-del-PC>:5080/health/ready` debe responder `ready`.
Este APK usa HTTP en la red local; no sirve fuera de ella. Para distribución hace falta una API HTTPS pública.

## Ver la app en web
Con la API en marcha: `npm --prefix apps/mobile run web -- --localhost` y abrir http://localhost:8081.
La web comparte pantallas y lógica; el mapa usa MapLibre GL JS. No sustituye las pruebas Android. Ver docs/WEB_PREVIEW.md.

## SQL Server / SSMS
Servidor `.\SQLEXPRESS`, autenticación Windows, base `Onda`. Tablas y consultas útiles: docs/SQL_SERVER.md.
Las migraciones se aplican explícitamente, nunca al iniciar la API.

## Verificación
- `npm run check:mobile` — TypeScript, ESLint y 62 pruebas.
- `powershell -ExecutionPolicy Bypass -File scripts/test-api.ps1` — 107 pruebas, incluidas integraciones con SQL Server real y alojamiento de producción.
- `powershell -ExecutionPolicy Bypass -File scripts/smoke-api.ps1` — catálogo real de extremo a extremo.
- `curl http://localhost:5080/api/v1/catalog/status`

OpenAPI: `/openapi/v1.json` en Development.

## Estructura
- apps/mobile: Expo Router, Zustand, TanStack Query, Expo Audio, MapLibre.
- backend: API, Application, Domain, Infrastructure, Tests.
- scripts: base de datos, API, pruebas y smoke test.
- docs: arquitectura, decisiones, progreso, roadmap, pruebas, diseño, SQL Server, dependencias.

Catálogo: [Radio Browser](https://www.radio-browser.info) (comunitario). Globo: NASA GIBS Blue Marble; calles: OpenFreeMap / OpenStreetMap.
Consultar [estado](docs/PROGRESS.md), [pruebas](docs/TESTING.md), [arquitectura](docs/ARCHITECTURE.md) y [roadmap](docs/ROADMAP.md).
