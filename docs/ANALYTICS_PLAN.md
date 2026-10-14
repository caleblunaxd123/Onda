# Analítica de negocio — todavía no activada

Fase gratuita: app_open, signup_completed, room_created, room_joined, room_join_failed,
playback_started/error, sync_recovered, invite_shared y room_returned.
Fases posteriores: poll_created, premium_viewed y eventos de compra/suscripción.
No emitir eventos para funciones que no existen.

Consentimiento/aviso, acceso restringido, retención definida, muestreo y IDs seudónimos.
Nunca enviar tokens, códigos/enlaces privados, cookies, mensajes personales, emails ni URLs de contenido.
Eventos agregados pequeños, cuotas y purga; evitar crecimiento indefinido del SQL/VPS.
Idempotencia y sesiones únicas para no contar duplicados/reconnects como usuarios nuevos.

Indicadores futuros: DAU/MAU, retención por cohortes D1/D7/D30, duración/reingreso a salas,
join fallidos, recuperación y errores de reproducción. Luego conversión, MRR, churn,
ARPU, coste variable/AI y margen. Mostrar ausencia de datos, no números ilustrativos en producción.
Hoy no existe un dashboard ni resultados reales de estos indicadores.
