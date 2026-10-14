# Informe de pruebas — 2026-10-14

## Automatizadas

| Validación | Resultado | Alcance |
|---|---|---|
| Backend Release con SQL Server real | 144/144, cero omitidas | Autenticación, salas, chat, bloques, denuncias, auditoría de revisión, migraciones y cinco clientes SignalR. |
| Vitest móvil | 94/94 | Sync, proveedores, chat/citas bloqueadas, versiones y ejecución del puente YouTube generado. |
| TypeScript y ESLint | Sin errores | Aplicación candidata 0.6.1. |
| Smoke público | 32/32 | API anterior en producción, Google habilitado, chat/pins y rechazo de adjuntos; no valida la nueva migración de seguridad. |

Logs locales: `.tools/rea-sync-backend-tests.log`, `.tools/rea-player-mobile-tests.log`,
`.tools/rea-player-types.log`, `.tools/rea-player-lint.log`, `.tools/google-enabled-public-smoke.log`.
REA CLI y MCP local fueron ejecutados; ver evidencias y alcance estático en [investigación](rea-investigation.md).

## Android

Emulador activo `emulator-5554`, 1080×2400, density 420, font_scale 1.0, orientación vertical.
Google: selección real de la cuenta autorizada y confirmación «Cuenta conectada con Google» en 0.6.0.
YouTube: navegador público → Big Buck Bunny → Ver juntos → frames reales; segundo cliente recibió media
y pausa compartida en nuestra sala QA privada. Captura `android-060-youtube-emulator-rea-review.png`.
La búsqueda también está registrada como evidencia de 0.6.0, no como ejecución de la candidata.

La candidata 0.6.1 se instaló con `-r` conservando cuenta/datos. Entrada pausada mostró miniatura oficial;
play y pausa desde el reproductor oficial se propagaron. Avance pausado 158,194709 → 168,194709;
retroceso 322,261159 → 312,261159, versión 14 → 15, pausa conservada. Se volvió a leer el snapshot del
segundo cliente después del buffering: posición y versión siguieron iguales. UI mostró 5:12 y el fotograma
real correspondiente. Captura `android-061-youtube-paused-seek.png`; contiene el aviso esperado de bloques
porque la API anterior todavía no ofrece ese endpoint. No implica QA completa de la nueva seguridad.

APK final: 124.503.330 bytes, SHA256 `1b2f302b2bc17bab50ec32a8379836f4ec73eebcfcc275081c69d788475afec5`,
versionCode 9, tres ABI. El intento de volver a 0.6.0 con `install -r -d` fue rechazado por Android
(`INSTALL_FAILED_VERSION_DOWNGRADE`). No se desinstaló ni borró almacenamiento: principal queda 0.6.1,
cuenta Google intacta. Se eliminaron únicamente la cuenta/sala QA creadas por nosotros y se detuvo su helper.
No afirmar pruebas físicas ni sincronización visual de cinco teléfonos a partir del test del protocolo.

## Limitaciones

El reinicio en segundo plano de API/web QA local fue rechazado por la revisión automática de permisos
(«blocked by policy»). No se eludió el rechazo. La base temporal propia se eliminó después de comprobar
sus cuentas y ausencia de estaciones ajenas. La nueva UI de moderación no tiene E2E visual completo.
Backend SQL y pruebas móviles sí comprueban sus contratos y permisos.

Pendientes: HLS nativo, voz WebRTC/TURN, iOS, Chrome físico para login Google web, cinco reproductores reales,
Wi-Fi/datos, TalkBack completo, batería y pruebas de tienda. No se activa cobro, publicidad ni planes premium.
