# Preparación de lanzamiento — beta 0.6.1 publicada

**Publicada con autorización explícita.** API/web/APK 0.6.1 y SafetyBlocks activos en Contabo; hash público
comprobado, chat 32/32 y seguridad 21/21. Emulador 0.6.1 con datos intactos; bloqueos ya cargan sin error.
Google está activo y el
acceso Android fue comprobado. OAuth permanece en Testing, por lo que no se anuncia acceso abierto a todos.

## Listo en código / validado

- Flujo crear → entrar → elegir contenido; inicio compacto, orientación portrait y chat con insets.
- YouTube oficial, radio y media directa; control por rol, cola, snapshots/versiones y reconexión.
- Chat persistente, stickers por ID, respuestas/reacciones/edición/borrado/pin; subidas nuevas rechazadas.
- Google nonce/validación oficial y cliente Android beta autorizado, sin secretos dentro de clientes.
- Candidata: bloques persistentes, reportes por mensaje y revisión auditada con allowlist de moderadores.
- 144 pruebas SQL, 94 móviles, tipos/lint limpios; smoke público 32/32 de la API vigente.

## Puertas pendientes

| Antes de | Condición |
|---|---|
| Publicar nuevas revisiones | Aprobar cada despliegue según el documento maestro; el de 0.6.1 ya terminó con respaldo/restauración, health, smokes y hash verificados. |
| Abrir OAuth | Revisar marca y requisitos Google, pasar audiencia de Testing cuando corresponda; verificar login web físico. |
| Operar UGC | Designar moderadores y configurarlos por ID en servidor; revisar reportes y plazos reales; aceptación de términos antes de publicar, política de edad/menores y procedimientos pendientes. |
| Tiendas | Firma de distribución/Play App Signing con OAuth propio, privacidad/fichas y revisión de requisitos UGC; beta actual usa firma de depuración. |
| iOS | Compilar y probar; cliente OAuth iOS y credenciales correspondientes. |
| Prometer HLS/voz | Implementar y comprobar expo-video y WebRTC/TURN, con consumo y límites. |
| Prometer estabilidad general | Pruebas físicas multiusuario, red variable, segundo plano, batería y accesibilidad. |

Contacto público elegido con autorización del propietario: **Caleb Luna — ONDA**,
**calebluna41@gmail.com**. No se inventó un buzón de soporte del dominio ni una razón social.
SMTP, verificación de correo y envío de recuperación siguen pendientes; código de recuperación disponible.

La API actual y otras aplicaciones del VPS se preservan. No hay pagos/suscripciones/ads activados.
Esta lista comunica límites verificables, no certifica aprobación de Google Play/App Store.
