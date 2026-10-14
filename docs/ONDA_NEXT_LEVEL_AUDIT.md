# Auditoría Next Level — 2026-10-14

Repositorio existente: Expo 57.0.28, React Native 0.86.3, Router, Reanimated 4.5.1,
TanStack Query/Zustand; ASP.NET Core .NET 10, SignalR, EF Core, SQL Server Express.
No se creó otra app ni microservicios. Evidencia separada: revisión de código, pruebas automatizadas,
smoke público y observación en emulador. No sustituye pruebas físicas ni certificación de tiendas.

| Área | Estado observado | Evidencia / siguiente mejora |
|---|---|---|
| Salas públicas/invitados | Funcional y verificada | Creación/join, permisos, invitación renovable, límite de 3 salas del propietario. No cerrar las reales para QA. |
| Identidad / biblioteca | Funcional y verificada | Guest/email/código privado; biblioteca local/nube, instalación -r preserva datos. |
| Google | Parcial, preparada | Android SDK y web GIS + servidor verifican ID token/nonce. Sin clientes OAuth, desactivada. No login real probado. |
| Inicio/diseño | Funcional, revisión final local | Identidad neón, tarjetas horizontales compactas, crear visible, filtros, catálogo separado. Ver UI_UX_REDESIGN_PROGRESS. |
| YouTube Android | Funcional y verificada | Página pública dentro de ONDA, selección compartida, cola e IFrame oficial. Restricciones de embedding se muestran. |
| YouTube web | Limitada por integración disponible | Pestaña externa + enlace; no hay Data API. No scrapear resultados ni streams. |
| MP4/WebM/audio abiertos | Funcional; prueba física pendiente | HTML5 aislado con adaptadores y corrección de reloj. HLS nativo todavía pendiente. |
| Radio | Funcional y verificada | SQL, favoritos, mapa, Radar, player nativo. Live no tiene seek ni simultaneidad garantizada de buffers. |
| Sincronización | Funcional, necesita ampliación | Versiones, timestamps, reloj medido, snapshots, backoff y recuperación de anfitrión. No prueba de redes físicas distintas ni SLA de drift. |
| Cola | Funcional y verificada | Proponer, votar, fijar prioridad, moderar y siguiente. Reordenamiento arbitrario/modos configurables pendientes. |
| Chat ligero | Funcional y verificada | Texto, respuestas, reacciones, edición/borrado, stickers por ID y un pin persistente. Subidas nuevas bloqueadas servidor/cliente. |
| Voz en vivo | No implementada | WebRTC/TURN, consentimiento, cuotas y coste de tráfico pendientes. No sustituir por grabaciones. |
| Moderación | Parcial | Reportar sala/usuario, silenciar local, expulsar y RoomBan persistente. Faltan bloqueo global/UserBlocks, reportar mensaje por ID, panel y auditoría operativa. |
| Comunidades/Moments | No implementadas como producto | ListeningRoom persiste, pero no separa PlaybackSession ni membresías/eventos/calendario. |
| AI | Radio existente; Host social no implementado | Ollama local y reglas; no modelos externos nuevos ni envío de conversaciones privadas. |
| Encuestas/trivias/traducción | No implementadas | No mostrar opciones funcionales falsas. |
| Monetización/analítica de negocio | No implementadas | Sin SDK de pagos, productos, cargos, anuncios ni telemetría nueva. Plan por fases en documentos relacionados. |

Validación actual: 140 backend SQL reales (0 omitidas), 87 móviles, TypeScript/ESLint y smoke público 32/32.
Emulador: YouTube oficial, mensaje recibido por otro cliente, pin, sticker sin adjuntos y teclado.
Las QA creadas por esta revisión se cerraron/eliminaron con sus propias credenciales; AndroidQA permanece.

Riesgos prioritarios: SDK nuevo exige documentación versionada; no tocar proyectos Android/iOS generados
a mano. No perder biblioteca/cuenta al instalar ni cerrar salas reales para eludir límites. Un iframe
puede rebuffer al remontarse; medir recuperación y mostrar estados sin interferir con controles oficiales.
No llamar bloqueo global al silenciamiento local, ni comunidad permanente a la persistencia técnica de Room.
Despliegues posteriores sujetos a aprobación del propietario según el último documento.
