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

No se ejecutaron pruebas físicas ni se dispone de un APK validado en esta entrega inicial.
