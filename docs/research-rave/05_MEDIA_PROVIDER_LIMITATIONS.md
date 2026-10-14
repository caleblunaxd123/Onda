# Capacidades reales por proveedor

| Fuente | Estado ONDA | Capacidades y límites |
|---|---|---|
| YouTube | IFrame Player API oficial, web/Android | Play/pausa/seek; errores y límites del propietario respetados. Navegador Android selecciona IDs públicos; no descarga streams |
| MP4/WebM y audio HTTPS abierto | HTML5 aislado | Play/pausa/seek/rate según reproductor; URLs validadas y protección SSRF |
| Radio | expo-audio | Fuente compartida y play/pausa; sin alineación precisa de buffers/seek |
| HLS/DASH abierto | Pendiente de adaptador nativo | No se anuncia funcional: resolver actual no admite sus manifiestos |
| Netflix y otros servicios de suscripción | Enlace externo + reloj manual | Cada persona abre su app/cuenta; ONDA no controla ni redistribuye su reproductor |
| Twitch / Drive / Photos | Pendiente | Necesitan integración oficial y validación específica; Google Sign-In no concede acceso a Drive |
| Voz en vivo | Pendiente WebRTC + TURN | Transporte separado, sin grabaciones ni adjuntos; hay que dimensionar coste/redes |

Los adaptadores existentes ya separan capacidades (`seek`, `rate`, `remoteControl`) de reglas de
sincronización. Una UI de proveedor no basta para declarar soporte. La presencia de WebRTC/mediasoup
en Rave tampoco autoriza integrar sus proveedores o copiar su implementación.

No se obtuvo un SDK/acuerdo autorizado para reproducción integrada de los catálogos de suscripción.
La captura MyDisney del propietario confirma una pantalla de acceso dentro del flujo Rave, no el
reproductor posterior. Un WebView Android carga una página como navegador integrado; un iframe web
inserta otra página dentro de un documento. Son superficies diferentes y tienen límites diferentes.
No se evitan DRM, licencias, cookies, CSP ni cuentas. El modo externo se presenta como sincronización manual.

Fuentes primarias: [YouTube IFrame](https://developers.google.com/youtube/iframe_api_reference),
[Media3](https://developer.android.com/media/media3/exoplayer),
[expo-video SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/video/).
Detalle de compatibilidad y errores: [matriz ONDA](../provider-compatibility.md).
