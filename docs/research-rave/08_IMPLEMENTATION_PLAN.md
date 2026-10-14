# Plan ejecutable y costes

## Implementado en esta candidata

1. Acceso Google/correo/recuperación vuelve al inicio; código privado disponible sobre navegación.
2. Foto oficial Google validada, persistida como URL y mostrada en perfil/inicio/presencia.
3. Una sala abierta por cuenta, retomable; creación concurrente devuelve 409. Transferencias protegen la regla.
4. Descubrimiento solo de salas con presencia real; filas más bajas y sin categorías repetidas en inicio.
5. Reloj monotónico, deduplicación durable del último control y pruebas de relojes/reintentos/reconexión.
6. Verificación de correo y adapter Resend preparados y desactivados; confirmación explícita por POST.

## Activación que necesita aprobación externa

El propietario aprobó Resend gratuito y DNS: dominio `mail.onda.lunalav.pe` verificado,
registros exactos añadidos solo a ese subdominio, TLS obligatorio y clave limitada a envío guardada
como secreto protegido en Contabo, legible solo por root/grupo de API dentro del montaje. Remitente `no-reply@mail.onda.lunalav.pe`.
No se activaron sobrecostes ni el envío en la API publicada. Ver [guía operativa](../EMAIL_VERIFICATION.md).

Pendiente: publicación coordinada API/migraciones/web/APK 0.6.2 con respaldo cifrado, restauración,
smoke y hash. **La autorización anterior cubría 0.6.1; esta candidata necesita nueva aprobación**
según la misión del propietario. Primero probar 0.6.2 contra su API compatible, sin borrar la app principal.

## Orden posterior

P0: medición en teléfonos de sync/reconexión, Google web, confirmación real de correo, moderador humano
configurado, accesibilidad y revisión de flujos vacíos/errores.
P1: HLS nativo autorizado, voz WebRTC/TURN con presupuesto, indicadores de readiness y fallos de reproducción.
P2: eventos/comunidades recurrentes, personalización y recomendación basada en señales agregadas económicas.

Monetización solicitada: primero beta gratis, adquisición, fallos y retención; después validar ONDA Plus
con interés real y compras sandbox; finalmente Creator/eventos patrocinados/publicidad moderada.
No activar modelos costosos, pagos, suscripciones ni publicidad en esta candidata. La moderación existente
no sustituye operación humana, documentación y revisión previa a tiendas.
