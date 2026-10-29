# Pruebas
## Candidata publicada 0.7.3

Tipos, lint, 62 pruebas cliente y export web correctos. CI backend/móvil de `f370570` correcta.
Respaldo: validación de versión, tamaños/listas, HTTPS, Unicode, whitelist, combinación sin pérdidas,
IDs nuevos de colección e idempotencia; puente del globo rechaza selección de IDs ausentes y coordenadas no finitas.

QA en navegador real: desktop y 390×844, exportación y reimportación, respaldo Android → web,
selección Perú → Lima, vista de calles, zoom, lista desplegable. Producción muestra el nuevo globo
tras recargar; HTML/rutas/JS/CSS/APK verificados contra artefactos locales, API ready 200.
Android: biblioteca previa conservada, exportación/selección de archivo/reimportación idempotente,
globo y widget real 4×2. Reproducción RTL desde widget observada con el proceso existente.

**No dar por aprobada la apertura desde widget con proceso cerrado:** el emulador QEMU terminó con
excepción Windows `0xc0000005` repetidamente, también con GPU por software. El enlace directo frío
sí llegó a PLAYING. El APK incorpora las correcciones de categorías e intent inicial mediante config
plugin, pero aún falta esa prueba en teléfono físico. No se afirma un fallo en teléfonos ni se sustituye
esta prueba por el reporte previo del usuario de tres teléfonos funcionando correctamente.
No se borraron datos del emulador; se conservó el respaldo exportado durante la QA.

Capturas: `docs/screenshots/*073*`. Documentación: LIBRARY_BACKUP_AND_GLOBE.md.

## Automatizadas
- Backend: `powershell -ExecutionPolicy Bypass -File scripts/test-api.ps1` (o `dotnet test backend/Onda.slnx -c Release`
  con `ONDA_TEST_SQL` definido). 107 pruebas: catálogo/API/SQL real y metadatos, proxy y alojamiento de producción.
- Móvil: `npm run check:mobile` (TypeScript, ESLint y Vitest). 62 pruebas.
- Catálogo real de extremo a extremo con la API en marcha: `powershell -ExecutionPolicy Bypass -File scripts/smoke-api.ps1`
  (`-Report` también guarda un reporte de prueba).
- Compatibilidad: en apps/mobile `npx expo install --check`; bundling `npx expo export --platform android`.
- CI (GitHub Actions): backend con contenedor SQL Server 2022 (`ONDA_TEST_SQL`), móvil con check + export Android.

### Qué cubren
| Área | Pruebas |
|---|---|
| Paginación filtrada | cursor por registros consumidos, páginas filtradas vacías intermedias, fin solo con página corta, recorrido completo sin saltos ni repeticiones, duplicados, cancelación (PaginationTests) |
| Cliente | seguir páginas vacías con límite, total de la primera página, acumulación sin duplicados en orden, tope en memoria (catalog.test.ts) |
| Normalización | nombres, etiquetas (alias, emojis), idiomas, países en español, HTTPS oficial alternativo, coordenadas inválidas, variantes verificables, disponibilidad sin «caída» por un fallo (CatalogTests) |
| SQL Server | migración del JSON antiguo, sincronización reanudable tras corte, retiro sin borrar, unicidad binaria de etiquetas, páginas exactas con total, variantes colapsadas con streams alternativos, rectángulos (incl. antimeridiano), clusters que suman el total, sin coordenadas, disponibilidad tras 3 chequeos, modo en vivo persistido y respaldo SQL si la fuente falla, reportes (SqlCatalogTests) |
| API | validación de filtros/cursor/bbox, sobre con cursor y total, 503, mapa, reportes 400/404/201, lookup, CORS (ApiTests) |
| Reproductor | un solo stream con 20 cambios rápidos, eventos tardíos, «conectando» ≠ «reproduciendo», reintentos acotados, failover entre fuentes HTTPS, tope total, temporizador también con JS retrasado, interrupciones/lockscreen respetadas, reintento manual (player-engine.test.ts) |
| Biblioteca y región | actualización de instantáneas sin perder datos, compatibilidad con almacenamiento antiguo, país automático/manual, detección por zona horaria (library/region tests) |

## Verificación 0.7.2 — 2026-10-28

- 107 backend con SQL real, cero omitidas; 47 cliente; tipos/lint. Nuevas pruebas de bloques ICY,
  Unicode, vacíos/truncados, intervalos/límites, redirecciones, IPs privadas/reservadas, caché
  breve y exclusión del OutputCache general. HLS sin ICY no descarga segmentos.
- Cliente: aborto y descarte de respuestas tardías, identidad fuente/estación, caducidad,
  pause, backoff, metadata nativa sin interrumpir audio y branding fallback.
- Servicio real: SomaFM MP3 devuelve canciones; Oxígeno/La Zona HLS consultadas devuelven unsupported.
  Verificado en API local y contenedor candidato con SQL de Contabo, sin migraciones.
- Android: code13 instalado con install -r, biblioteca conservada, MediaSession con título/estación,
  artwork y cambios de canción. Panel del sistema revisado y Pausa real → PAUSED. Captura
  `android-072-system-media.png`. Es el panel multimedia de ajustes rápidos; el emulador no mostró
  keyguard al dormir/despertar. Bloqueo real/Doze/Bluetooth en teléfonos físicos e iOS pendientes.
- Publicación: image/source fijadas, restore-check, ready, HTML/CSS/JS y APK comparados por Cloudflare.
  Catálogo y restantes rutas mantienen compatibilidad; servicios ajenos conservados.

## Verificación 0.7.1 — 2026-10-28

- 41 pruebas cliente, tipos y lint. Añadidas coberturas de volumen activo/cambio de fuente/clamp/NaN
  y migración del tema inmersivo conservando la biblioteca y la elección explícita de tema.
- Export web y APK tres ABI correctos. Actualización `install -r` de code11 a code12 conserva
  favoritos e historial; cambio de país a Perú se refleja en Inicio sin solicitar ubicación.
- Web 390/768/1440/1920 px sin desbordamiento horizontal del documento. Barra lateral y reproductor
  persistente desde 1000 px; móvil conserva pestañas. Navegar Radar → Inicio oculta la pantalla anterior.
- Radio Oxígeno reproduciéndose en web; navegación a Biblioteca conserva audio; volumen/silencio,
  temporizador y cancelación comprobados. Favorita añadida aparece inmediatamente en Inicio y tras recargar.
- Creación de colección en el origen local de QA; no se modificó la biblioteca de producción del propietario.
- Mapa real, filtros de búsqueda y reproductor de dos columnas revisados. Capturas `docs/screenshots/*071*`.
- API/SQL sin cambios; CI backend/móvil correcto en `b439759`. No se repitió la batería SQL local para esta
  entrega visual; los 69 casos se ejecutaron de nuevo en CI. No equivale a pruebas físicas.

## Verificación en emulador (2026-10-12)
Emulador `emulator-5554` Medium_Phone_API_36.1 con el Development Build existente (sin cambios nativos: no fue
necesario recompilar). Zona horaria del emulador ajustada a America/Lima (estaba en GMT). API con SQL Server Express.
Comprobado visualmente (capturas en docs/screenshots): Inicio claro/oscuro con saludo según hora local, destacada y
populares de Perú; búsqueda con filtros y total real; Mundo centrado en Perú con etiquetas en español, clusters, zoom,
selección mapa↔lista y reproducción; reproductor con ondas, «EN VIVO» tras evento nativo y reporte guardado en SQL;
Radar con alcance por país y carga progresiva más allá de la primera página; biblioteca con datos de la versión anterior
conservados tras varios cierres forzados; ajustes con país automático y estado del catálogo.
Web (navegador integrado, 375 px): mapa centrado en Perú, clusters, zoom y lista sincronizada.

Segundo plano (2026-10-13): con la app fuera de pantalla 20 s, `dumpsys media_session` → PLAYING,
`dumpsys audio` → AudioTrack de la app `started`, `dumpsys activity services` → AudioControlsService en primer plano.
Comprobación de 4,5 min no concluyente (la app volvió a primer plano). Comandos para repetirla en un teléfono por USB:
`adb shell dumpsys media_session`, `adb shell dumpsys audio`, `adb shell dumpsys activity services app.onda.radio`.

Esto **no** sustituye las pruebas físicas: no se verificó audio audible, Bluetooth, llamadas, batería, memoria
ni segundo plano prolongado.

## Prueba física obligatoria (pendiente)
1. Iniciar API y Development Build en Android; comprobar conexión al backend.
2. Escuchar al menos tres emisoras AAC/MP3 y una HLS si el dispositivo la soporta.
3. Cambiar entre 20 estaciones con rapidez; confirmar un único stream audible y memoria estable.
4. Navegar por todas las pestañas mientras reproduce.
5. Bloquear pantalla 30 minutos; probar notificación y play/pause del sistema.
6. Auriculares/Bluetooth: conectar/desconectar; llamada entrante; verificar interrupción/reanudación esperada.
7. Modo avión, reconectar y stream caído: comprobar reintentos, fuente alternativa y botón Reintentar.
8. Temporizador con pantalla activa y bloqueada.
9. Favorito + cierre forzado + reapertura; historial solamente tras evento real playing.
10. Mapa: zoom, clusters, seleccionar marcador, reproducir; «Sin ubicación» lista las emisoras sin coordenadas.
11. Radar: deslizar sin que suene; activar sintonía automática; carga de más emisoras.
12. TalkBack, texto grande, «reducir movimiento», rotación, distintos tamaños, tema claro/oscuro/sistema.
13. Medir FPS/memoria/batería en gama media. Revisar permisos y que no haya micrófono/GPS.
14. Release: HTTPS, firma, política de datos, reportes y auditoría.

## Biblioteca y colecciones
1. Crear una colección desde Biblioteca y otra desde el menú ⋮ de una emisora («Guardar en una colección»).
2. Guardar una emisora en varias colecciones; guardarla de nuevo no crea duplicados.
3. Buscar por nombre, país o género dentro de la biblioteca; limpiar la búsqueda.
4. Renombrar una colección; rechazar un nombre vacío o formado solo por espacios.
5. Quitar una emisora de una colección: conserva sus favoritos, historial y otras colecciones.
6. Cancelar el borrado y confirmar el borrado de una colección propia.
7. Cerrar/reabrir la app: conservar colecciones y favoritos.
8. Rehidratar almacenamiento anterior sin colecciones: conservar biblioteca previa.
9. Probar formulario, teclado y hojas inferiores en tema claro/oscuro y con texto grande.

## Publicación de radios 0.7.0 — 2026-10-28

- Backend 69/69, cero omitidas; móvil 38/38, TypeScript/ESLint sin errores.
- Pruebas de producción: orígenes CORS, confianza de proxy, index sin caché, APK con rangos
  y rutas retiradas404 en vez de HTML. Regresión de favoritos/colecciones y tema soft de la beta social.
- `smoke-api.ps1` público: 200 IDs únicos en cuatro páginas de Perú, total 257; mapa 115 en 13 celdas;
  42 lugares, facetas de géneros/idiomas, descubrimiento 20 y emisoras sin coordenadas 197.
- Publicación pública: API live/ready 200, catálogo SQL, CORS permitido/denegado, rutas sociales 404,
  redirección de enlace antiguo de sala al inicio, index y tres assets idénticos al export, Cloudflare DYNAMIC.
- APK público descargado completo: 117.248.287 bytes y SHA256 igual al local. Versión0.7.0/code11,
  misma firma beta, tres ABI, sin permiso de micrófono/GPS, HTTP claro desactivado, bundle sin salas/auth.
- zipalign de 16 KB y segmentos LOAD de 44 bibliotecas nativas de 64 bits alineados a 16 KB. No es ejecución en 16 KB.
- Android: instalación `-r`, favorito RTL retenido, pantalla de inicio y biblioteca sin funciones sociales;
  reproducción de Radio La Zona Urbana observada en UI y sesión multimedia. El propietario también
  interactuó durante la revisión; no atribuir todas esas selecciones a un script autónomo.
- Web: mapa renderizado con tiles, clusters, 82 emisoras en área visible y reproducción de Radio Oxígeno.
- Evidencia: `android-070-radio-home.png`, `android-070-radio-playback.png`, `web-070-radio-world.jpg`.
- Teléfonos físicos, redes móviles, llamadas, auriculares/Bluetooth, pantalla bloqueada y consumo siguen pendientes.
- Logs privados en `.tools/radio-070-*`; no se versionan claves, sesiones ni respaldos.
