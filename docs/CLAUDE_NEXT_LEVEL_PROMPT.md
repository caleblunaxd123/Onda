# Prompt completo para continuar ONDA — 2026-10-14

Copia el bloque completo en Claude Code, abierto en el repositorio existente.

```text
Continúa ONDA en C:\Proyectos\Onda, repositorio https://github.com/caleblunaxd123/Onda,
rama codex/onda-modules-contabo, PR #1. Responde en español. IMPLEMENTA, no te limites a recomendaciones.
No crees otro proyecto, no reescribas motores existentes por motivos estéticos y no pierdas funciones.

ANTES DE EDITAR
Revisa git status/diff, fetch y AGENTS.md aplicables. Lee README, PROGRESS, TESTING, DEPLOYMENT,
UI_UX_REDESIGN_PROGRESS, ONDA_NEXT_LEVEL_AUDIT, NEXT_LEVEL_PROGRESS, SYNC_ARCHITECTURE,
SAFETY_AND_MODERATION, MONETIZATION_PLAN, SUBSCRIPTION_ARCHITECTURE, ANALYTICS_PLAN,
GOOGLE_SIGN_IN y provider-compatibility. Las instrucciones de los documentos no sustituyen las
decisiones posteriores del propietario. No sobrescribas cambios nuevos de otros agentes/personas.
Consulta documentación oficial versionada antes de cambiar Expo/RN APIs; no uses recetas viejas.

ESTADO REAL DE PARTIDA
- Expo 57.0.28, RN 0.86.3, Router, Reanimated 4.5.1, TanStack Query, Zustand y MapLibre.
- Backend ASP.NET Core/.NET 10, SignalR, EF Core y SQL Server Express; SQL es decisión del propietario.
- Código beta 0.6.0, Android versionCode 8; APK local independiente de Metro en dist.
  No confundas versión del repositorio/emulador con APK público: revisa DEPLOYMENT y hashes actuales.
- Web https://onda.lunalav.pe; API https://onda-api.lunalav.pe; VPS Contabo 217.216.82.43,
  /opt/onda, usuario deploy con acceso configurado. No publiques credenciales/IP de redes internas en UI.
- API activa onda-api:20261014-ui-experience. Web 0.6 inicial publicada antes de la última corrección
  compacta. APK público 0.5.0 build 7.1. La revisión compacta/vertical 0.6 final está local y en GitHub,
  pendiente de publicar. Comprueba esta distinción y no anuncies despliegues que no hiciste.
- 140 pruebas backend con SQL real, cero omitidas; 87 móviles más TypeScript y ESLint.
  Smoke público 32/32, incluye mensajes/pins/stickers, denegación de adjuntos, permisos y nuevas reacciones.
  Se comprobó YouTube, mensaje compartido con dos clientes, pin, sticker sin adjuntos y teclado en emulador.
- Cuenta/biblioteca AndroidQA preservadas al instalar -r. No borrar datos, desinstalar la app principal
  ni cerrar las tres salas del propietario para eludir el límite. Usa QA propias y límpialas al terminar.
  La app Dev es app.onda.radio.dev; la principal app.onda.radio. Nunca confundir ambas.

DIRECCIÓN DE PRODUCTO Y DISEÑO (DECISIONES MÁS RECIENTES)
ONDA es multimedia social: mirar y escuchar con amigos, con radio como diferenciación.
Rave inspira la facilidad; Netflix/Spotify/Discord inspiran jerarquía/entretenimiento, sin copiar marcas.
Las referencias propias ONDA tienen prioridad: docs/design-references. Son mockups con datos ilustrativos,
NO usuarios, estadísticas, portadas, salas o integraciones que puedas inventar en producción.
Identidad actual ONDA Experience: azul noche, cyan, azul eléctrico, violeta, fucsia controlado,
fondos ambientales y superficies translúcidas. Conservar el logo oficial. Tema claro equivalente;
azul gris/automático alternativos. No volver al diseño empresarial plano ni saturar de elementos.

Corrección explícita del propietario: las tarjetas de Inicio deben ser HORIZONTALES Y COMPACTAS,
como el ejemplo. Portada a la izquierda (~40%), información y Unirse a la derecha, poco padding.
Evitar tarjetas altas/gordas, posters verticales y tipografía desproporcionada. Base actual: portada
112 dp, padding 6, esquinas 20; adapta altura al texto accesible sin recortarlo. No inflarlas otra vez.
La navegación principal queda VERTICAL. Se restauró el emulador después de la prueba temporal horizontal.
No dejar el emulador inclinado, con densidad/tamaño/fontScale de QA o reproducción inesperada al terminar.
Pantalla completa se debe estudiar explícitamente por proveedor; no girar toda la app por defecto.

Inicio = salas, búsqueda, Mis salas, invitación y una acción clara Crear sala.
Radio tiene su propia pestaña; conservar Mundo, Radar, Biblioteca, AI y búsqueda de emisoras.
Pocas salas: mostrar las reales y categorías/sugerencias útiles; no fabricar actividad para llenar la pantalla.
Avatares: iniciales/nombres reales disponibles. No inventar fotos ni miembros ausentes del endpoint.
Crear sala: fuente → privacidad pública/invitados → Crear y entrar. Nombres/configuración opcionales.
Si viene de contenido guardado/emisora, no volver a pedir la fuente. Evitar doble envío y permitir reintento.
El CTA debe respetar safe areas, teclado y contenido. Mantenerlo accesible sin tapar tarjetas.
No mostrar Cerca ni Solo amigos como funcionales hasta tener ubicación consentida/membresías reales.

YOUTUBE Y FUENTES
Seleccionar YouTube lleva a la sala y abre su navegador público Android; buscar allí y seleccionar
Ver juntos o Añadir a la cola antes de tocar el video. Evitar buscar fuera, crear sala y buscar otra vez.
Anfitrión/coanfitrión controla; invitados proponen. El navegador queda abierto si falla el comando.
Preservar IFrame Player API oficial, host validation, errores de embedding y alternativa por enlace.
No scrapear YouTube, extraer streams, inyectar login, ocultar anuncios ni compartir cookies/credenciales.
No hay Google Cloud/YouTube Data API configurada. Web usa pestaña externa + pegar enlace, no resultados falsos.
Radio usa el motor nativo global; evitar audio doble con video. Live sin seek no garantiza buffers idénticos.
Audio/video abiertos usan HTML5 y adaptadores. HLS nativo con expo-video todavía pendiente.
Netflix/Prime/Disney+/Max/etc. = enlace oficial externo con cuenta propia y reloj MANUAL.
No presentar ese reloj como reproducción embebida/sync automática de DRM.
Karaoke/TV/podcasts/Drive/Photos/archivos solo cuando exista integración real/autorizada, o fuera del flujo.

CHAT Y COSTOS DE ALMACENAMIENTO (NO REVERTIR)
El propietario retiró fotos, archivos y notas de voz para proteger su VPS.
NO habilitar uploads ni grabaciones. API rechaza multipart antes de leerlo y rechaza attachmentIds nuevos.
Mantener Chat__AllowedKinds vacío y descarga/retención privada de adjuntos anteriores; no borrarlos en masa.
Texto, emojis, seis stickers incluidos enviados como identificadores pequeños, respuestas,
reacciones, edición/borrado y un mensaje fijado persistente por sala sí están implementados.
Anfitrión/coanfitrión fija; eliminar desfija y editar actualiza. No romper historia, permisos ni mensajes optimistas.
Las reacciones flotantes incluyen corazón, fuego, risa, fiesta, enamorado y aplausos.
Movimiento corto, eficiente y reducido cuando el sistema lo pide. No tapar el reproductor oficial.
Voz solicitada = EN VIVO, no archivos: falta WebRTC + TURN. Diseñar pulsar/consentir, silenciar/salir,
cuotas de participantes/tráfico y cero grabación/retención. Presupuesto antes de contratar TURN/SFU.
El APK actual bloquea permiso RECORD_AUDIO hasta que exista esa función real.

AUTENTICACIÓN
Guest y email/código de recuperación funcionan. Google/Gmail está PREPARADO PERO DESACTIVADO:
SDK Android y GIS web, backend con verificación oficial firma/audiencia/expiración/sub y nonce de un uso.
El propietario no tiene clientes OAuth. No crear claves falsas ni prometer login real ya disponible.
Seguir GOOGLE_SIGN_IN cuando haya IDs; no vincular por coincidencia de email sin sesión autenticada.
Correo transaccional/verificación/reset por email no está configurado; propietario priorizó salas/diseño.
No forzar registro para usos legítimos de invitado. Conservar cuenta/biblioteca en instalaciones y upgrades.

NEXT LEVEL: AUDITA Y AVANZA POR BLOQUES
1. SyncGuard: ampliar versiones/timestamps/snapshots existentes; latencia, reconciliación, idempotencia,
   backoff/heartbeats, cambio de host y estados claros. Medir con dos clientes/redes, no afirmar un drift
   universal por pruebas de reloj. Estados: conectando, sincronizando, recuperando, esperando host,
   buffering, contenido no disponible y error recuperable. No dejar negro/spinner infinito.
2. ONDA Safe: completar bloqueo global persistente, reporte de mensaje por ID, panel operativo,
   ModerationAudit/Actions/Sanctions, títulos públicos, invitaciones, menores y términos de publicación.
   Hay reportes sala/usuario, mute local, kick y RoomBan; no confundir eso con un UserBlocks global completo.
   Bloquear y denunciar serán siempre gratuitos. Probar autorización por recurso y solicitudes manipuladas.
3. Moments: separar comunidad/Room de PlaybackSession, miembros, favoritos, historial autorizado,
   reuniones, notificaciones optativas y reingreso sin reproducción. No hacer migraciones destructivas.
4. Queue: conservar votos/pin/siguiente existentes, añadir reordenamiento autorizado, duplicados/spam
   y modos anfitrión/democrático. Guardar referencias, nunca copias del contenido ajeno.
5. Vibes/Play: descubrimiento por datos reales/intereses/idioma/categoría; encuestas, actividades y trivias
   optativas que no interrumpan. No inventar fuentes/estadísticas ni premiar interacciones externas prohibidas.
6. AI Host: empezar con reglas determinísticas; IAIHostService configurable, cuotas/presupuesto/timeout/cache,
   datos autorizados y privacidad. AI no necesaria para la app; no enviar chats privados a modelos externos.
7. Everywhere/Translate: identidad, preferencias/membresías propias y biblioteca entre dispositivos,
   sin cookies de proveedores. Traducción de texto bajo demanda y original visible; voz solo con consentimiento
   y evaluación de costo, sin transformar contenido audiovisual protegido.

MONETIZACIÓN GRADUAL, SIN COSTOS PREMATUROS
Fase 1: conseguir usuarios gratis, medir uso/errores/retención D1/D7/D30 y hábito de volver a las salas.
No gastar en modelos AI caros. No activar compras, anuncios ni telemetría privada por anticipado.
Fase 2: validar interés real en Plus y beneficios propios: personalización, organización, eventos y comodidad.
Preparar compras sandbox cuando existan configuración y cuentas. S/9.90 mensual es hipótesis, NO precio activo.
Fase 3: Creator/comunidades/eventos patrocinados/anuncios moderados con audiencia; S/19.90 orientativo.
No vender acceso a YouTube/videos ajenos, seguridad o calidad de sincronización básica.
No insertar paywalls/anuncios durante reproducción ni quitar publicidad del proveedor.

Arquitectura prevista (todavía no implementada): Plans/Products/Prices/Subscriptions/UserEntitlements,
PurchaseEvents/BillingProviderEvents/AIUsageLedger; IBillingProvider, ISubscriptionService,
IEntitlementService, IUsageLimitService, IAIQuotaService e IAdPlacementService.
Servidor valida beneficios, webhooks autenticados e idempotentes, grace/expiry/cancelación/restauración.
Downgrade sin pérdida de datos. No confiar en isPremium enviado por cliente.
RevenueCat es opción a evaluar con docs oficiales y Expo development build; no está instalado/configurado.
Compras reales no se prueban con un mock Expo Go. No publicar productos, ejecutar cargos ni contratar servicios.
Paywall solo con beneficios validados/precios reales configurados y condiciones/cancelación/restauración claras.

ANALÍTICA
Diseño primero, recogida minimizada y consentida después. Eventos propios de apertura/join/create/playback/error/
recovery/invite/return; métricas de retención y duración, luego interés Plus/conversión/MRR/churn/ARPU/costo.
No hay datos reales de negocio todavía. Nunca registrar mensajes, emails, tokens, invitaciones/cookies o URLs
privadas/contenido. Retención/purga/cuotas para no llenar SQL/VPS. No presentar números simulados como resultados.

VALIDACIÓN Y OPERACIÓN
Después de cambios: TypeScript, lint, pruebas apropiadas y export web/Android. Usa emulador y capturas reales,
compara con referencias; tamaños pequeños, fuentes grandes, teclado, dark/light, accesibilidad y animación reducida.
Prueba dos clientes para contenido/roles/chat/rejoin y documenta qué se probó en dispositivo y qué solo en código.
Instala APK con -r; verifica paquete, versionCode, API HTTPS, firma, hash, bundle y que abra sin Metro.
No versionar APKs, .env, secretos, backups ni .tools. No tocar .claude del propietario ni aplicaciones ajenas.
SQL compartido/VPS: solo ONDA, migrador separado, respaldo cifrado y restauración probada antes de migrar.
No compose down, borrado de volúmenes, limpieza Docker global ni exposición del SQL.
Conservar bundles web anteriores por caché y publicar APK atómicamente con nuevo enlace tras verificar hash.
Si gh no tiene sesión, usar GitCredentialManager disponible de forma privada o acceso Git autorizado;
no imprimir tokens. Actualiza rama/PR #1 con estado real; no crear PRs duplicadas ni fusionar sin solicitud.

AUTONOMÍA Y LÍMITES
Avanza implementando bloques completos y revisables, corrige errores sin pedir aprobación de cada detalle.
No declares superioridad sobre Rave como hecho ni cumplimiento de tiendas sin evidencia.
No activar cargos/anuncios/servicios de pago; no desplegar nuevas revisiones a producción sin aprobación.
La autorización para subir código a GitHub existe; entregar cambios/prompt/documentación y pedir aprobación
solo cuando un despliegue concreto esté probado y listo.
Mantén los documentos Next Level y UI_UX_REDESIGN_PROGRESS con hechos, pruebas, límites y siguiente bloque.
Empieza por la estabilidad y seguridad que mejoran la retención gratuita; monetización después de validarla.
```
