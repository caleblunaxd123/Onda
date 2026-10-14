# Actualización 0.6 — 2026-10-14

Prioridades actuales: UI compacta/vertical, estabilidad y seguridad gratuita; después retención,
validación Plus sandbox y, con audiencia, Creator/comunidades/patrocinios.
Consultar NEXT_LEVEL_PROGRESS, ONDA_NEXT_LEVEL_AUDIT y CLAUDE_NEXT_LEVEL_PROMPT.
Sin pagos/servicios/IA costosa ni subidas nuevas. El alcance anterior siguiente se conserva como historial.

# Roadmap — ONDA multimedia social

## Implementado y desplegado (beta 0.5)
- Catálogo SQL real, fuentes alternativas HTTPS, búsqueda por palabras/filtros, mapa, Radar, inicio y ánimos.
- Biblioteca de radios/colecciones y multimedia, historial real, cola de radios, temas y perfil.
- Salas públicas/privadas: invitación directa web/Android, invitados, chat, reacciones, propuestas/votos,
  control del anfitrión, transferencia, bans por sala, reportes, reconexión, renovación de invitaciones.
- Radio en vivo, YouTube/YouTube Music con video, archivos HTTPS compatibles de audio/video.
- Cuenta opcional, recuperación por código, eliminación, sincronización con conflictos y consentimiento para historial.
- Descubrimiento con IA local validado contra catálogo, fallback honesto; pasaporte de países escuchados.
- HTTPS en Contabo/Cloudflare, backups cifrados/restauración real, APK con bundle y web pública.
- Salas cinematográficas, modo cine, escritorio en dos columnas y móvil compacto; portadas reales, búsqueda de salas,
  invitación copiable y enlaces pegables, selección desde guardados, chat con seguimiento y seek accesible.
- Dos coanfitriones para reproducción/cola; moderación reservada al anfitrión. Continuidad optativa tras 60 s,
  gracia para reconectar, prioridad a coanfitrión conectado. Cola fijada y estado de votos propio al reconectar.

- Navegador YouTube integrado Android y cambio de contenido para el grupo; búsqueda web externa y enlaces.

## Próximo trabajo, en orden
La decisión actual reemplaza cualquier propuesta anterior de adjuntos: chat ligero sin fotos, archivos ni
grabaciones. Inicio de salas y radio en pestaña propia ya publicados; pins y stickers locales implementados.
Google Android/web preparado y desactivado hasta recibir IDs OAuth; ver GOOGLE_SIGN_IN.md.
1. Cerrar beta física: audio audible, 30 min bloqueado, Bluetooth/llamadas, reconexión y TalkBack/texto grande;
   sincronía multimedia entre dos teléfonos en redes diferentes; medir errores y tiempos reales.
2. Salas recientes, colecciones compartidas y ajustes editables de sala; medir la continuidad recién implementada.
3. Voz opcional con WebRTC, push-to-talk, reducción de música al hablar, mute/bloqueo por usuario y controles claros;
   primero sala privada, con mediciones de latencia y batería.
4. Colecciones compartidas y sesiones programadas: mezclar radio/música/video, permisos, enlaces y recordatorios optativos.
5. PiP/casting y continuidad entre dispositivos con los SDK oficiales que lo permitan.
6. Moderación operativa, correo verificado/OAuth, backup externo automático, monitoreo y firma para distribución.
7. Full-Text SQL si el perfilado demuestra necesidad; biblioteca editorial y accesibilidad/rendimiento ampliados.

## Diferenciación que debemos medir
Enfocar la ventaja en entrar fácilmente, descubrir contenido real y mantener una sesión comprensible cuando falla
la red o el proveedor. Invitado por enlace, privacidad predeterminada, una sola cola y estado honesto ya están en la beta.
No afirmar superioridad sobre Rave sin pruebas comparativas con personas; no asumir sus carencias.

Experimentos: tiempo hasta reproducir juntos, porcentaje de invitaciones que terminan en entrada, recuperación
tras desconexión y retención semanal. Telemetría mínima, informada y sin almacenar conversaciones por defecto.

## Límites vigentes
Presencia y votos en memoria en una sola instancia; chat persistente en SQL con retención máxima de 30 días.
Las subidas de adjuntos están deshabilitadas. Radio tiene buffers independientes.
Recuperación requiere código privado; no SMTP/identidad de correo verificada. No todos los videos permiten embed.
No hay integraciones de plataformas premium; implementarlas solo con APIs oficiales y permisos aplicables.
140 pruebas backend y 87 móvil no sustituyen pruebas de Android físico ni certifican producción.
