# Compatibilidad de proveedores — 2026-10-14

Cómo reproduce ONDA cada fuente dentro de una sala, qué controla de verdad y qué no. Regla general: ONDA
sincroniza solo reproductores que permiten control oficial; nunca extrae streams, licencias, cookies o tokens,
no suplanta clientes oficiales ni elimina restricciones de un reproductor.

## Referencia: qué se sabe de Rave
| Tipo | Afirmación | Fuente |
|---|---|---|
| Documentado | Admite YouTube, Netflix, Amazon Prime, Disney+, HBO Max, Twitch, Crunchyroll, Google Drive y Google Photos. | [FAQ de Rave](https://rave.io/es/faq) |
| Documentado | Para Netflix/Prime/Disney+/HBO Max hace falta una suscripción de pago y se inicia sesión «en Rave». | FAQ de Rave |
| Documentado | Drive/Photos: se sube el video a Google, se inicia sesión desde Rave y se elige el archivo. | FAQ de Rave |
| Documentado | Disponible en iOS, Android, Chromebook, Huawei, Windows y Mac; habla y texto mientras se ve. | FAQ de Rave |
| Evidencia independiente | Cada participante necesita su propia cuenta del servicio. | [TechHive](https://www.techhive.com/article/578415/streaming-video-options-that-let-cord-cutters-stream-movies-together.html), [ITWeb](https://itweb.co.za/article/rave-app-hopes-to-unite-lone-video-watchers/Pero3qZlLrJ7Qb6m) |
| Hipótesis sin validar | Que Rave use una WebView con Widevine y control inyectado, o acuerdos comerciales con los servicios. | Discusión pública (Stack Overflow 61725589, no consultable de forma automatizada). No hay documentación de Rave. |

La FAQ no describe el mecanismo de sincronización ni acuerdos. ONDA no asume ninguno.

## Matriz
| Proveedor | Adaptador ONDA | Reproduce en la app | Control y sync | Estado |
|---|---|---|---|---|
| YouTube / YouTube Music | `YouTubePlaybackAdapter`: IFrame Player API oficial dentro de un WebView/iframe aislado con `origin` | Sí, si el propietario permite insertarlo | play/pausa/seek/estado/errores; sin control de velocidad para corrección fina → seek solo por encima del umbral | **Funcional** |
| Video MP4/WebM HTTPS público | `WebEmbedPlaybackAdapter`: `<video>` HTML5 aislado | Sí | play/pausa/seek + corrección progresiva por velocidad (±5 % por defecto) | **Funcional** |
| Audio MP3/M4A/OGG/AAC/WAV | Mismo adaptador HTML5 | Sí | Igual que video | **Funcional** |
| Radio en vivo | Reproductor nativo global (expo-audio) | Sí | play/pausa; sin posición (es en vivo, buffers independientes) | **Funcional** |
| HLS / DASH abiertos | `NativeVideoPlaybackAdapter` con expo-video (Media3/AVPlayer) | Planificado (P1) | expo-video expone `currentTime`, `playbackRate` 0–16, `statusChange`, `timeUpdate` | **Pendiente**; hoy el servidor solo acepta `.mp4/.webm` |
| Netflix, Prime Video, Disney+, Max, Apple TV+, Crunchyroll, Paramount+, MUBI | Modo externo (`stream`): enlace oficial del título | No: se abre la app/web oficial de cada persona | Reloj de referencia compartido, pausa y chat; **sin control remoto** | **Funcional como sincronización manual** |
| Contenido DRM propio con licencia | `AuthorizedDrmPlaybackAdapter` vía expo-video `source.drm` (Widevine/PlayReady en Android, FairPlay en iOS) | Solo con servidor de licencias y derechos propios | Igual que video nativo | **No disponible**: no hay catálogo ni licencias autorizadas |
| Twitch | IFrame/Embed oficial de Twitch (requiere `parent` de dominio) | Evaluar | El Embed API ofrece play/pausa/seek para VOD | **No implementado** |
| Google Drive / Photos | API oficial con OAuth del usuario | Evaluar | Requiere OAuth y verificación de app de Google | **No implementado** |

## Netflix y plataformas DRM
- **Widevine/FairPlay** protegen la licencia. expo-video admite DRM solo con `licenseServer` propio; tener soporte
  técnico de Widevine no da autorización para reproducir el catálogo de Netflix u otro servicio.
- **WebView**: los servicios no permiten insertarse en sitios de terceros (X-Frame-Options/CSP en web) y su uso en
  WebView depende de sus términos y del nivel de seguridad DRM del dispositivo. Controlar su reproductor con
  scripts inyectados o fingir ser un navegador de escritorio es suplantar al cliente oficial: ONDA no lo hace.
  Un prototipo así existió solo en una build de desarrollo local durante esta iteración y se retiró sin publicarse.
- **Integraciones oficiales**: no hay SDK público de co-visionado para estos servicios (Netflix, Disney+, Prime).
  Sin acuerdo o API autorizada, la experiencia honesta es abrir el título en la app oficial con el reloj de la sala.
- **Qué ve la persona**: «Sincronización manual: ONDA no controla el reproductor del servicio».

## YouTube
- Reproductor IFrame oficial (`enablejsapi` mediante la API, `origin` del sitio, `playsinline`, `rel=0`);
  marca, anuncios y políticas intactos. No se extraen enlaces internos ni se descargan streams.
- Errores oficiales: 2 (parámetro inválido), 5 (error HTML5), 100 (privado o eliminado), 101/150 (el propietario
  no permite insertarlo). ONDA explica el motivo y ofrece «Elegir otro video» al anfitrión; no lo evita.
- Cambios de video en el propio reproductor: el anfitrión los comparte; un invitado vuelve al video de la sala.

## Pendientes priorizados
1. P1: `NativeVideoPlaybackAdapter` con expo-video para HLS/MP4 y pantalla completa nativa.
2. P2: Twitch Embed oficial (VOD y directos) y evaluación de Drive con OAuth verificado.
3. P3: DRM solo con contenidos/licencias propios o acuerdos oficiales.
