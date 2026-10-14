# Proveedores: capacidades comprobadas

Esta matriz describe la implementación actual; no promete integraciones por mostrar un logotipo.

| Fuente | Implementación | Control compartido | Limitación actual |
|---|---|---|---|
| YouTube | IFrame Player API oficial; exploración pública integrada en Android | Play, pausa, seek, cola y cambio de contenido, permisos de servidor | Algunos videos rechazan embed; web busca fuera y admite pegar enlace; no hay YouTube Data API. |
| MP4/WebM HTTPS | HTML5 en página aislada | Play, pausa, seek y ajuste gradual de velocidad | Códecs y autoplay dependen de plataforma. |
| Audio HTTPS | HTML5 en página aislada | Play, pausa y seek cuando exista duración | No equivale a Spotify u otro catálogo protegido. |
| Radio | expo-audio y catálogo remoto real | Cambiar emisora/play/pausa | Live con buffers individuales: no tiene posición idéntica entre personas. |
| HLS/DASH abierto | Sin adaptador nativo aún | Pendiente | La API actualmente acepta video directo MP4/WebM, no HLS. |
| Netflix/Prime/Disney+/Max y otros externos | Abrir enlace oficial individual y reloj de referencia de sala | Coordinación manual, chat | ONDA no reproduce ni controla esos servicios; no existe integración autorizada configurada. |
| Twitch/Drive/Photos | Pendiente | Pendiente | Requieren implementación oficial y, cuando aplique, OAuth/acuerdo. |

Contrato existente: `PlaybackAdapter`, `FramePlaybackAdapter`, `ExternalProviderAdapter`,
`ProviderCapabilities` y `UnsupportedOperation`. Un adaptador externo rechaza operaciones que no puede
realizar. Añadir HLS debe extender validación de enlaces y adaptador, no crear otro coordinador paralelo.

YouTube mantiene marca, anuncios y restricciones. No se extraen streams ni se almacenan videos en Contabo.
La selección de un invitado propone contenido; la de un controlador puede cambiarlo para todos.
Los controles ±10 segundos de la candidata se ofrecen solo para YouTube con duración finita y permiso.

Referencias: [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference),
[expo-video SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/video/),
[investigación previa de compatibilidad](provider-compatibility.md).
Los acuerdos y restricciones de otros proveedores deben verificarse antes de ofrecer una nueva integración.
