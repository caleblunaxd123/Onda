# ONDA Experience — rediseño 2026-10-14

Referencias: cuatro imágenes ONDA y documento Master UI/UX proporcionados por el propietario.
La nueva dirección neón sustituye al azul gris como predeterminado. Claro, suave y automático siguen disponibles.
Se preserva la decisión anterior de NO fotos, archivos ni grabaciones. Las categorías de esas referencias
no habilitan subidas. No se inventan salas, participantes, contadores, avatares ni integraciones.

## Auditoría
- Expo 57 / React Native 0.86; Router y Reanimated ya instalados. Sin librerías nuevas.
- Inicio usa RoomSummary real: portada, nombre, fuente y cantidad de conexiones. El endpoint no ofrece
  fotos ni nombres de anfitriones ajenos; no se reemplazan con personas ilustrativas.
- Radio/catálogo, Mundo, Radar, Biblioteca y AI siguen accesibles.
- Motor multimedia/SignalR separado del layout; no se sustituyen adaptadores de reproducción.
- Google está preparado pero sin OAuth. Voz WebRTC/TURN, HLS nativo, ubicación y amigos no implementados.

## Implementado y revisado en emulador
- Tokens inmersivos y claros, gradiente de acciones con texto blanco legible; logo oficial conservado.
- OndaAmbientBackground: capas nativas de gradientes/ondas, sin blur, capturas incrustadas ni bucles.
- OndaGradientButton, OndaGlassSurface, OndaCategoryTile, OndaPressable, OndaMotionCard,
  OndaSkeleton, OndaReactionOverlay. Se extienden los componentes existentes en vez de duplicar todo.
- Reanimated: presión 100/160 ms, entrada de tarjetas 220 ms, reacciones breves. Preferencia de
  movimiento reducido consultada y actualizada con AccessibilityInfo.
- Inicio: título/subtítulo, búsqueda real por sala/contenido, filtros música/video, tarjetas con
  portadas grandes y Unirse. Pocas salas: sugerencia de uso y categorías reales, sin datos falsos.
- Crear: fuente → privacidad pública/invitados → Crear y entrar. Contenido preseleccionado no se pregunta
  otra vez; nombres/preferences opcionales. Protección contra doble envío y errores previos preservados.
- Sala: ambiente según fuente, avatares reales conectados, invitación, reproductor y chat con safe areas.
- Acceso, búsqueda de radio, ajustes y navegación usan la identidad compartida.

## Validación
- Primera revisión TypeScript, ESLint y 87 pruebas móviles pasó tras regenerar rutas tipadas con Expo.
- TypeScript y ESLint finales sin avisos; 87 móviles y 140 SQL (0 omitidas); smoke público 32/32.
- APK tres ABI compilado e instalado con -r. Inicio final compacto revisado visualmente: portada112dp, padding6.
- Exploración devuelve catálogo real; teclado, pin, sticker compartido y QA360x640/fontScale1.3 comprobados.
- Prueba temporal horizontal realizada y restaurada; app final fija navegación portrait.
- Modo claro requiere comparación final. Pruebas físicas/TalkBack/batería y todos los módulos Next Level no completados.
- Se rechazó iniciar un nuevo Metro por política automática; la revisión visual usará APK independiente.

## Límites conocidos
- No hay búsqueda YouTube Data API web ni resultados/estadísticas simulados. Android usa página pública
  del proveedor; web usa pestaña externa/enlace. ONDA no modifica la interfaz interna de YouTube.
- Servicios de suscripción: enlace oficial y reloj manual, sin DRM embebido.
- Solo privacidad pública/invitados; no mostrar Amigos o Cerca como modalidades funcionales.
- Notificaciones/presencia de perfil no tienen servicio real; no mostrar badges falsos.
- Verificación física/TalkBack, rendimiento/batería reales e iOS siguen pendientes.
