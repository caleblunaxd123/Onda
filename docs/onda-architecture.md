# Arquitectura real de ONDA — candidata 0.6.1

## Aplicación

`apps/mobile`: Expo 57.0.28, React Native 0.86.3, React 19.2.3, TypeScript 6.0.3,
Expo Router (rutas en `app/`), TanStack Query, Zustand, Reanimated 4.5.1 y SignalR 10.0.11.
La configuración nativa viene de app.json/app.config.ts; Android generado no se edita manualmente.

Inicio y exploración usan datos reales de salas; Crear sala elige fuente/privacidad y entra antes de
seleccionar el contenido. Radio, Mundo, Radar y biblioteca conservan sus módulos. Perfil y ajustes
comparten tema, reducción de movimiento y preferencias. La identidad ONDA usa acentos cian/violeta
y superficies legibles, con temas claro, suave y de inmersión.

Separación existente:

- `features/rooms`: cliente SignalR, tipos/versiones, sync-engine, adaptadores, navegador YouTube,
  pantalla, layout, chat y cola.
- `features/account`: sesión, Google, bloqueos y acceso a moderación.
- Reproductor radio: expo-audio nativo; YouTube/MP4/audio de salas: página aislada oficial/HTML5.
- Estado remoto: Query; sesión/preferencias locales: Zustand y almacenamiento seguro nativo.

## API y persistencia

Backend .NET 10: `Onda.Api`, `Onda.Domain`, `Onda.Infrastructure`, `Onda.Tests`.
Minimal APIs, EF Core, SQL Server Express, SignalR y servicio de mantenimiento. La autorización se
resuelve en servidor por cuenta, sala y rol, no por propiedades enviadas por el cliente.

SQL conserva cuentas, estaciones, favoritos, salas, cola, mensajes/reacciones/pins, sesiones, denuncias
y bloqueos. La presencia activa y fan-out pertenecen al proceso SignalR: un reinicio exige reconectar
y pedir snapshot. No se presenta el despliegue de una instancia como escalado horizontal listo.

La reproducción comparte media, posición, instante del servidor y versión. El cliente estima desfase
de reloj y proyecta el estado; el servidor valida anfitrión/coanfitrión, revisión y bloqueo de sala.
Ver [sincronización](playback-synchronization.md).

## Autenticación y seguridad

Invitado, correo/contraseña y Google. Google valida firma, audiencia, emisor, expiración, correo verificado
y nonce de un solo uso; vinculación por `sub`, sin apropiarse de una cuenta por correo coincidente.
Android Google comprobado con la cuenta autorizada; web/iOS tienen verificación pendiente.
No hay SMTP transaccional configurado; el código privado de recuperación es el mecanismo existente.

La candidata añade bloqueos persistentes, denuncias por mensaje y revisión privada limitada a una
allowlist del servidor. Sin esa configuración ningún usuario se convierte en moderador.
Las subidas de fotos/archivos/notas grabadas siguen deshabilitadas antes de leer multipart.

## Despliegue

Contabo: API Docker, SQL dedicado dentro de servidor compartido, Caddy existente y Cloudflare.
Web Expo exportada; APK beta firmado para pruebas. Ollama local tiene fallback por reglas;
no se activaron modelos pagados, suscripciones ni cargos. Ver [estado de lanzamiento](LAUNCH_READINESS.md).
