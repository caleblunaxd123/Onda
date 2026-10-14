# Pruebas
## Automatizadas
- Backend: `powershell -ExecutionPolicy Bypass -File scripts/test-api.ps1` (o `dotnet test backend/Onda.slnx -c Release`
  con `ONDA_TEST_SQL` definido). 96 pruebas; ninguna omitida en la validación Windows con SQL Server real.
- Móvil: `npm run check:mobile` (TypeScript, ESLint y Vitest). 60 pruebas.
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

## Verificación en emulador (2026-10-12)

Actualización 13/10: APK 0.2 instalado con `adb install -r`, sin borrar datos, con WebView/SignalR y bundle incluido.
Emulador x86_64: entrada por `onda://room?code=...`, sesión invitada, misma sala que web, estado/posición compartidos.
Web pública: entrada por enlace sin cuenta, dos participantes, reproducción YouTube, pausa para todos y media guardada.
Prueba CLI pública independiente con dos clientes SignalR: roles, privado, votos, chat, rotación y cierre; QA eliminada.
Cloud SQL pública: upgrade preserva identidad, invalida tokens anteriores, guarda multimedia, rechaza versión stale y recupera.
IA pública: engine `local-ai`, rock/PE, idioma no inferido por escribir en español, 8 estaciones reales.
Backup cifrado descifrado y restaurado en DB aparte después de migrar comunidad; catálogo poblado verificado.
La prueba automatizada del decoder URI incluye 20.000 secuencias UTF-8 malformadas sin división recursiva.

Capturas: `android-social-home.png`, `android-social-room.png`, `web-room-two-participants.png` en `docs/screenshots`.
Estos controles complementan, pero no sustituyen, la lista de pruebas físicas al final.
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

## Beta 0.3
Continuidad probada en SQL con reloj controlado y en Contabo con el margen real de 60 s.
Reconexión dentro del margen conserva al anfitrión; opción desactivada impide takeover.
Coanfitrión controla reproducción/cola y no puede cerrar/rotar invitaciones. Votos y prioridad fijada reales.
Android 0.3 y web en la misma sala: pausa desde Android reflejada en web, chat y propuesta desde biblioteca.
Capturas: android-cinema-room.png, web-cinema-room.png, web-cinema-queue.png.
CI: corregida la comprobación nullable de map-style.ts observada en Linux.

CI final backend/móvil verde en Linux. Degradados: adaptador explícito entre CSS web y experimental_backgroundImage
de RN 0.86; Inicio y Juntos verificados en Android con el APK corregido.
