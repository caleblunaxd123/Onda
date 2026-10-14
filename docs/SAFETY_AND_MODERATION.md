# Seguridad social — candidata 0.6.1

Implementados y comprobados con SQL: autorización por recurso/rol, límites de SignalR/chat, expulsión y
prohibición persistente por sala; bloqueo global de cuentas, denuncia por ID de mensaje, evidencia textual
limitada a 2.000 caracteres y bandeja privada de revisión. Las subidas nuevas siguen deshabilitadas.

Bloquear persiste en servidor y oculta mensajes/citas/reacciones. Restringe en ambas direcciones la entrada
a salas donde la otra persona es anfitriona, las retira de la lista pública y revoca el acceso correspondiente
si ya estaban dentro. No promete separar a ambos en cualquier sala de un tercero. Lista propia y desbloqueo
están en Cuenta → Personas bloqueadas; quien denuncia no aparece en el chat/panel público.

Solo cuentas registradas incluidas en `Moderation:AccountIds` del servidor pueden revisar reportes. Por
defecto la lista está vacía. El backend valida cada consulta/acción. El panel ofrece descartar, borrar mensaje
denunciado o cerrar sala, con motivo obligatorio y fecha/revisor/estado persistidos. Un caso ya revisado devuelve 409.
No habilitar moderadores por nombre/email aportado por cliente ni exponer la bandeja a todos los anfitriones.

La candidata oculta mensajes de terceros si no pudo cargar los bloqueos y anuncia el fallo con reintento.
Publicar la APK junto a la API nueva; la anterior devuelve 404. Reportes tienen retención de 90 días;
chat/adjuntos legados conservan 30 días.

**Despliegue pendiente:** SafetyBlocks no aplicado en Contabo, allowlist sin responsables activos y E2E visual
de moderación incompleto. La auditoría se conserva en el reporte; no se afirma un sistema completo de sanciones.
Antes de tiendas quedan aceptación de términos para UGC, política de edad/menores, filtros apropiados y
revisión humana con plazos. El código no reemplaza esa operación.

Denuncia, bloqueo y moderación básica serán gratuitos; no incluirlos en Plus ni vender tolerancia al abuso.
Consultar requisitos vigentes de UGC antes de presentar la app:
[Google Play](https://support.google.com/googleplay/android-developer/answer/9876937),
[Apple, apartado 1.2](https://developer.apple.com/app-store/review/guidelines/).
Esto es un plan de implementación, no una declaración de cumplimiento de tiendas.
