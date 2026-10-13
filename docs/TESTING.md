# Pruebas
## Automatizadas
Backend: dotnet test backend/Onda.slnx
Móvil: npm run check:mobile
Compatibilidad: en apps/mobile ejecutar npx expo-doctor y npx expo install --check.
Bundling: npx expo export --platform android.
Build: APP_VARIANT=development npm run android (PowerShell: usar $env:APP_VARIANT).

PlayerEngine tests usan handles falsos para verificar coordinación, no decodificación de audio.
API tests usan catálogo falso controlado para validar contratos y errores, no disponibilidad externa.
Verificación real de SQL Server y Radio Browser documentada en PROGRESS.md.

## Prueba física obligatoria
1. Iniciar API y Development Build en Android; comprobar conexión al backend.
2. Escuchar al menos tres emisoras AAC/MP3 y una HLS si el dispositivo la soporta.
3. Cambiar entre 20 estaciones con rapidez; confirmar un único stream audible y memoria estable.
4. Navegar por todas las pestañas mientras reproduce.
5. Bloquear pantalla 30 minutos; probar notificación y play/pause del sistema.
6. Auriculares/Bluetooth: conectar/desconectar; llamada entrante; verificar interrupción/reanudación esperada.
7. Modo avión, reconectar y stream caído: comprobar backoff limitado y botón reintentar.
8. Temporizador con pantalla activa y bloqueada. JS suspendido puede retrasarlo: no darlo por validado.
9. Favorito + cierre forzado + reapertura; historial solamente tras evento real playing.
10. Mapa: zoom, clusters, seleccionar marcador, reproducir; emisoras sin coordenadas permanecen en lista.
11. Radar: activar Sintonizar, deslizar y pausar; no precargar streams.
12. TalkBack, texto grande, rotación, distintos tamaños, tema claro/oscuro/sistema.
13. Medir FPS/memoria/batería en gama media. Revisar permisos y que no haya micrófono/GPS.
14. Release: HTTPS, firma, política de datos, reportes y auditoría.

Development Build compilado e instalado en el emulador Medium_Phone_API_36.1.
La interfaz de biblioteca y el catálogo se revisaron en emulador; esto no sustituye las pruebas físicas anteriores.

## Biblioteca y colecciones
1. Crear una colección desde Biblioteca y otra desde el botón + de una emisora.
2. Guardar una emisora en varias colecciones; guardarla de nuevo no crea duplicados.
3. Buscar por nombre, país o género dentro de la biblioteca; limpiar la búsqueda.
4. Renombrar una colección; rechazar un nombre vacío o formado solo por espacios.
5. Quitar una emisora de una colección: conserva sus favoritos, historial y otras colecciones.
6. Cancelar el borrado y confirmar el borrado de una colección propia.
7. Cerrar/reabrir la app: conservar colecciones y favoritos.
8. Rehidratar almacenamiento anterior sin colecciones: conservar biblioteca previa.
9. Probar formulario, teclado y panel de guardado en tema claro/oscuro y con texto grande.
