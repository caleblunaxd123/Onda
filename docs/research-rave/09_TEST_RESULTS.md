# Evidencia de pruebas — 2026-10-14

## Producción publicada 0.6.1

- Respaldo cifrado y restauración en base separada antes de aplicar SafetyBlocks.
- Salud live/ready 200/200; Google activo; web pública comparada con export.
- Smoke chat 32/32, seguridad 21/21; cuentas/salas propias QA eliminadas.
- APK público code9 y SHA256 comprobados; Android 0.6.1 mostró bloqueos sin error.

## Candidata 0.6.2

Las pruebas SQL crean/eliminan bases locales propias. No usan cuentas/salas de producción.
Backend: **164/164**, cero omitidas, SQL real local, 48 segundos; log `.tools/research-backend-tests.log`.
Cliente: **99/99**, 15 archivos; TypeScript y ESLint limpios, `.tools/research-mobile-tests.log`.
Tres migraciones aditivas: ProfileAvatar, EmailVerification, PlaybackIdempotency. Ninguna aplicada en producción.
Web exportada y APK beta **0.6.2/code10 compilado**, firmado y con API HTTPS embebida comprobada.
APK: 124.514.158 bytes; SHA256 `cba8590a88ff2415ce779bc79c636a4a2060cf57cd5b7d84f710ade86bcb9db2`.
Misma firma beta Google (SHA1 `5e8f16062ea3cd2c4a0d547876baa6f38cabf625`), tres ABI y sin RECORD_AUDIO.
Se comprobó que la clave Resend no está en el bundle. Artefacto local `dist/ONDA-0.6.2-contabo.apk`, no instalado.
La primera compilación agotó Metaspace; la llamada directa siguiente carecía de ANDROID_HOME.
Con SDK explícito, dos workers, heap 3 GiB y Metaspace 1 GiB, build exitoso en 13m25s. El script de build
incorpora los límites; no se cambió configuración global. Avisos de deprecación de dependencias/Gradle persisten.

## Correo autorizado

Resend confirmó el dominio ONDA y TLS obligatorio; cuenta en plan Free, 3.000/mes y 100/día,
dos de tres dominios, extras de pago deshabilitados. Clave solo envío/solo dominio ONDA, guardada en VPS
root:grupo API/mode640 dentro de carpeta root/0700. DNS de otros proyectos preservados. Prueba sintética a `delivered@resend.dev`, dirección
oficial sandbox: HTTP **200** con HttpClient .NET 10 y respuesta con ID. No verifica llegada a un inbox real.
La prueba con urllib recibió 403 sin JSON; no se interpretó como error de clave ni se ampliaron permisos.
Prueba del flujo real registro→inbox→confirmación queda pendiente de publicar la API compatible.

Cobertura añadida: foto y dominio Google; código privado no persistido; creación concurrente de sala;
descubrimiento con entrada/salida; control idempotente y rejoin; transferencia con sala previa;
reloj monotónico frente a saltos; cinco relojes simulados; tokens hasheados, vencimiento, reenvío,
un solo uso, remitente desactivado/fallo real y confirmación que no consume enlaces por GET.

La exportación web compila; esto no equivale a prueba visual completa. No se instalará una candidata
que requiere endpoints nuevos sobre la app principal conectada a la API 0.6.1.
QA visual local anterior quedó interrumpida y un reinicio de servidores en segundo plano fue rechazado
por aprobación automática. No se intentó eludir ese rechazo. Continúan pruebas independientes SQL/build.

Rave: instalación Play y firma de tres APK verificadas; bloqueo explícito de emulador impide una sesión
dinámica. REA estático no demuestra sync real. Pendientes teléfonos físicos y dos redes reales.
