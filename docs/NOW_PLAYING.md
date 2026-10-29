# Canción actual y controles del sistema

## Contrato

`GET /api/v1/stations/{id}/now-playing?source=1` devuelve `stationId`, `source`,
`status` (`available`, `unsupported`, `unavailable`), `title` y `observedAt`.
`source` es la posición (1–5) de la fuente HTTPS en el catálogo. No se admiten URLs arbitrarias.
404 para estación inexistente, 400 para índice inválido. Respuestas HTTP `no-store`;
la caché compartida del servidor conserva el instante de observación original.

El título es texto publicado por la emisora, sin reconocimiento de audio ni IA. Puede representar
artista/canción, un programa o un anuncio. Se presenta tal cual; no se inventan artista, portada ni duración.

## Compatibilidad y coste

ICY (`Icy-MetaData: 1`, `icy-metaint`, `StreamTitle`) en fuentes HTTPS compatibles. No descarga
segmentos HLS, no extrae audio cifrado ni realiza scraping de las webs de las emisoras.
En la comprobación real, SomaFM Groove Salad MP3 publicó canciones. Las fuentes HLS consultadas
de Radio Oxígeno y Radio La Zona Urbana no ofrecieron ICY: se muestra título no disponible.
Esto no implica que todas las variantes de esas emisoras carezcan siempre de información.

Máximo cuatro sondeos simultáneos; cada uno cierra la conexión tras obtener el título, tres bloques,
menos de 210 KiB o 8 s. Los bytes de audio se descartan en memoria, sin guardar/retransmitir grabaciones.
Caché con tamaño acotado, 20 s para resultados y 120 s para fuentes incompatibles; rechazos rápidos al
saturarse, sin cola ilimitada. Solo se consulta mientras hay reproducción; 30 s entre consultas y
120 s para incompatibles. Se cancela al cambiar de fuente o pausar; títulos de más de 90 s se descartan.
No hay nuevas tablas, tareas persistentes ni consumo de modelos de IA.

## Red

Solo fuentes conocidas de una estación; HTTPS, sin credenciales ni fragmentos. Redirecciones
manuales (máximo tres), sin downgrade, cookies, proxy o acceso a direcciones privadas/locales/reservadas.
La resolución DNS se valida y se fija la IP al abrir el socket, conservando SNI y validación TLS normales.
También se validan las redirecciones. No se siguen URLs de imágenes incluidas en los metadatos ICY.

## Pantalla bloqueada

`expo-audio` activa MediaSession/controles del sistema. Con canción: título publicado + nombre
de la emisora como artista. Sin canción: nombre de la radio y país. Se añade el nombre ONDA y logo
de la emisora; si no hay logo, se aporta la marca ONDA desde `/brand/onda-radio.png`.
La actualización de metadatos no reinicia el audio. Las transmisiones son en vivo, sin búsqueda temporal.
Android controla composición, colores, tipografía y qué datos muestra según su versión/fabricante.
El color puede derivarse de la imagen; ONDA no fuerza una interfaz propia sobre el bloqueo.
Los temporizadores JS pueden retrasarse con restricciones de batería; no prometer refresco exacto
cada 30 s en todos los teléfonos con pantalla apagada. Verificar en dispositivos físicos.

## Referencias

- [Expo Audio SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/audio/): `updateLockScreenMetadata`.
- [Controles multimedia Android](https://developer.android.com/media/implement/surfaces/mobile).
- [Metadatos ICY en FFmpeg](https://ffmpeg.org/ffmpeg-protocols.html).
- [Conexión HTTP con IP validada](https://learn.microsoft.com/dotnet/api/system.net.http.socketshttphandler.connectcallback).
