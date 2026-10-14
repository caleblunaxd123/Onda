# Progreso — candidata 0.6.1 (2026-10-14, Lima)

Actualización: OAuth creado en `onda-511605` con autorización, cliente web/Android, audiencia externa en
Prueba. API Google activa y acceso real Android confirmado. Web muestra botón oficial; login web completo
pendiente. `docs/GOOGLE_SIGN_IN.md` contiene IDs públicos y límites.

La candidata local añade UserBlocks persistente, lista de bloqueados, restricción bidireccional de salas
del otro, ocultación de mensajes/citas/reacciones, reportes de mensajes por ID y bandeja privada de revisión.
Moderadores solo mediante allowlist del servidor (vacía por defecto); acciones reales: descartar, borrar
mensaje denunciado y cerrar sala; motivo, revisor y fecha persistidos. Evidencia textual limitada a 2.000
caracteres, retención de reportes 90 días. Se mantiene la prohibición de adjuntos nuevos.

144 pruebas backend SQL reales, 94 móviles, TypeScript/ESLint limpios y smoke público 32/32 con Google
activado. La nueva migración de seguridad todavía NO se aplicó en Contabo. Se añadió target model a la
migración Google existente para que EF pueda generar/revertir snapshots correctamente; no cambia su SQL.
QA visual local no completada: procesos interrumpidos y reinicio en segundo plano rechazado por política.
Sus dos cuentas/base propia fueron eliminadas verificando que no contuviera cuentas ni estaciones ajenas.

Solicitud nueva: investigar REA y priorizar reproductores/sincronización; conservar auditorías/evidencias
previas y no repetir una reescritura. Toda publicación nueva exige aprobación del propietario.

REA 6.5.0 instalado localmente con Node 24 de Codex; registro MCP autorizado y respaldado, seis herramientas
estáticas habilitadas. Doctor/self-test local pasó; esta conversación usa CLI porque el catálogo aún no lo
cargó. Inspección real del DLL propio y métodos RoomsHub documentada en `rea-investigation.md`.

P0/P1: rechazo de snapshots viejos, limpieza del temporizador de reloj, prueba SQL con cinco conexiones,
seek YouTube en pausa, deduplicación/revisiones del puente, cue oficial al entrar pausado y orden de pausa
antes de seek para no cancelar buffering. Estado de pausa visible y botones compartidos ±10 segundos.
La candidata se probó en el emulador y quedó instalada con datos intactos: Android rechazó downgrade
a 0.6.0. Su chat muestra aviso de bloques hasta publicar la API nueva; no se borró almacenamiento.
Producción conserva la API anterior de moderación. Sala/cuenta QA propias eliminadas.

Decisiones actuales del propietario: producto multimedia social; inicio sencillo como lista de salas;
identidad ONDA Experience neón (claro/suave alternativos); Crear sala → fuente/privacidad → entrar → buscar dentro. El chat NO permite subir fotos,
archivos ni grabaciones. Solo texto, respuestas, reacciones, stickers incluidos, edición/borrado y mensajes fijados.
Voz en vivo pendiente, sin grabar audio. Google ya tiene OAuth y acceso Android real; ver límites arriba.

## Base 0.5 publicada y conservada
- Inicio: salas, invitaciones, búsqueda y «Crear sala». Radio pasa a pestaña propia; catálogo, Mundo, Radar,
  biblioteca y ONDA AI se conservan. `/rooms` redirige al inicio, incluyendo el filtro «Mis salas».
- Selector: cuatro fuentes principales; otros servicios explican que se abren fuera de ONDA y usan reloj manual.
- YouTube Android: página pública integrada, sin repetir el buscador del proveedor. Elegir «Ver juntos» o
  «Añadir a la cola» antes de tocar el video. Un invitado propone; anfitrión/coanfitrión cambia para todos.
  Selecciones fallidas no cierran el explorador; reintento y entrada por enlace disponibles.
- Sala: búsqueda, personas y opciones accesibles. Cambiar fuente, invitar y resincronizar desde opciones.
  Reproductor de radio compacto y margen del chat corregido frente a la barra de gestos/teclado.
- Chat: seis stickers locales enviados como texto identificador, sin archivos. Un mensaje fijado por sala,
  persistente y visible al volver a entrar; anfitrión/coanfitrión puede fijarlo. Editar actualiza la vista fijada;
  eliminar lo desfija. Respuestas, reacciones, edición y borrado siguen disponibles.
- Subidas deshabilitadas en cliente y API, antes de leer multipart. También se rechazan nuevas notas de voz
  y envíos con adjuntos desde clientes anteriores. Descarga privada de adjuntos antiguos preservada;
  retención del chat de 30 días. El directorio de uploads tenía 4 KB (vacío) al verificar esta entrega.
- Google preparado: SDK Credential Manager Android, Google Identity Services web, verificación Google oficial
  en servidor, audiencia/firma/expiración y nonce de un solo uso. Identidad por `sub`, sin tomar cuentas ajenas
  por coincidencia de correo. Upgrade de invitado conserva ID y revoca sesiones anteriores.
  **No activo ni probado con una cuenta Google real:** el propietario aún no tiene clientes OAuth.

## Validación y producción
- 140 pruebas backend con SQL Server Express real; 87 móviles + TypeScript/ESLint. Export web y APK arm64,
  armv7 y x86_64. Prueba pública de dos clientes: 32/32, incluida denegación de todos los adjuntos y pins.
- Android: búsqueda real Big Buck Bunny → selección compartida; Sintel a la cola sin cambiar el actual.
  Beta 0.5: mensaje real, fijar, salir/reentrar y ver el fijado; sticker recibido por segundo cliente sin adjuntos.
  Cuenta AndroidQA y biblioteca preservadas con instalación `-r`; se cerraron/eliminaron solo QA propias.
- Capturas actuales: android-050-home, android-050-chat-pin-sticker, android-050-google-prepared y web-050-home.
- API Contabo `onda-api:20261014-light-social`; web exportada; APK 0.5.0 versionCode 7 publicado.
- Migración GoogleIdentity aditiva (columna nullable + índice único filtrado), aplicada explícitamente con
  migrador separado tras respaldo cifrado y restauración comprobada, incluidos adjuntos.
- Antes de finalizar hubo un rollback automático por una comprobación de salud incorrecta. La imagen fue
  validada por separado y el despliegue final quedó listo. Tres invitados de ese smoke fallido se retiraron
  por IDs/nombres/horario exactos, sin tocar otras cuentas. Smoke final y QA nativa verificaron su propia limpieza.
- HTML SPA `no-store, max-age=0`; bundles anteriores conservados para visitantes con HTML previo.

## Pendiente real
1. Voz en vivo WebRTC + TURN: consentimiento al pulsar, silenciar/dejar canal, sin grabaciones, límites de
   participantes y tráfico. No confundir notas de voz con esta función.
2. Google: crear clientes Web/Android y registrar paquete/huella; configurar IDs y probar cancelación,
   login y vínculo con cuentas reales. iOS necesita su cliente y esquema de retorno; no fue compilado aquí.
3. Video nativo HLS con expo-video; pruebas físicas de audio, Bluetooth, teclado, batería y redes diferentes.
4. Firma para tiendas, correo transaccional, alertas y backups externos automáticos.

No afirmar reproducción Netflix/Disney/Prime integrada, búsqueda YouTube web nativa, voz RTC, PiP o casting.
Ver provider-compatibility.md, TESTING.md, DEPLOYMENT.md y GOOGLE_SIGN_IN.md.

## Revisión 0.6 actual
- Inicio ambiental, salas horizontales compactas (portada 112 dp/padding 6), CTA que reserva espacio, filtros en sheet.
- Selector fuente/privacidad/Crear y entrar, perfil/acceso, biblioteca y exploración de salas/guardados/radios con listas virtualizadas.
- Reacciones animadas con movimiento reducido, avatares reales en la sala y tema claro.
- Navegación vertical fijada en app.json; emulador restaurado tras QA horizontal, densidad/fontScale normales.
- API onda-api:20261014-ui-experience y web inicial 0.6 publicadas bajo autorización anterior.
  La última corrección compacta/vertical y el APK 0.6 quedan locales/en GitHub; no publicados tras la instrucción nueva.
- No monetización/telemetría nueva. Auditoría y planificación Next Level documentadas; ninguna función comercial simulada.
- Prompt completo: CLAUDE_NEXT_LEVEL_PROMPT.md. Faltan RTC, HLS, OAuth real, pruebas físicas y seguridad global/comunidades.
