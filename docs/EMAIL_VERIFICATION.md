# Verificación de correo: candidata 0.6.2

Estado: implementación y pruebas locales; **dominio Resend verificado y clave preparada, sin correos reales enviados**.
El propietario autorizó Resend gratuito, acuerdos, clave de envío y DNS. Se accedió por Google a su cuenta
existente; sus dominios y claves de otros proyectos permanecieron intactos. Dominio ONDA en São Paulo,
TLS Enforced, seguimiento no configurado. La integración todavía no está activada en la API 0.6.1.
Google ya verifica el correo del ID token. Las cuentas con contraseña permanecen sin confirmar hasta
consumir el enlace. Esta versión registra la confirmación; no impone bloqueo retroactivo a usuarios existentes.

## Configuración preparada

Remitente: `ONDA <no-reply@mail.onda.lunalav.pe>`. Origen: `https://onda.lunalav.pe`.
Subdominio propio para no cambiar MX/servicio de correo del dominio raíz. Crear dominio en Resend,
copiar únicamente sus registros exactos de verificación a Cloudflare como DNS sin proxy y esperar validación.
No inventar claves DKIM/SPF ni reemplazar un registro raíz existente.

Crear API key limitada a envío para ese dominio; escribirla en archivo secreto legible solo por API/root del VPS,
montarlo read-only en API y definir `Email__ApiKeyFile` con su ruta dentro del contenedor.
Nunca usar EXPO_PUBLIC, Git, URLs, capturas o logs para la clave.
Solo entonces activar `Email__Enabled=true`, `Email__FromAddress` y `Email__PublicOrigin`.
La clave ya está en `/opt/onda/secrets/resend-api-key`, root:1654/mode640 dentro de directorio root/0700,
fuera de Git. El grupo permite leer el mount a la API no root (UID/GID 1654); otros procesos del host no
pueden recorrer ese directorio. Overlay preparado `infra/contabo/compose.email.yaml`, montaje de secreto.
Configuración combinada validada en VPS con `docker compose config --quiet`; contenedor temporal
sin red, read-only, sin capacidades y con UID/GID1654 confirmó lectura. No se activó el overlay en la API.
Todavía no se modificó compose ni se reinició la API para usarla. La revisión automática rechazó
eliminar la copia local de staging: permanece en `.tools/resend-secret/api-key`, ACL solo propietario/SYSTEM,
excluida de Git. No se intentó eludir ese rechazo ni se mostró el valor de la clave.

Registros exactos del proveedor añadidos a la zona Cloudflare lunalav.pe, TTL automático, solo DNS:

| Tipo | Nombre relativo | Contenido |
|---|---|---|
| TXT | resend._domainkey.mail.onda | Clave pública DKIM proporcionada por Resend; no se reproduce aquí |
| CNAME | rsend.mail.onda | rsend-sae1.forge.rmta.net |
| CNAME | send.mail.onda | send.forge.rmta.net |

Resend confirmó `verified`; se verificó también resolución DNS pública. No se activó recepción,
tracking ni autoconfiguración con acceso delegado a Cloudflare. No se cambió DMARC/MX del dominio raíz.
Captura privada verificable: `.tools/resend-domain-verified.jpg`.

[Resend gratuito](https://resend.com/pricing) limita actualmente 100 envíos/día y admite tres dominios
personalizados. Panel de la cuenta comprobado: Free, 3.000/mes, 100/día, dos de tres dominios,
pay-as-you-go/add-ons deshabilitados. No habilitar pagos por exceso. La integración no
contrata planes ni envía marketing. [Verificación de dominio](https://resend.com/docs/dashboard/domains/introduction).

## Flujo y seguridad

Registro solicita envío después de guardar la cuenta, devuelve `emailVerificationStatus` real.
Si el proveedor falla, la cuenta existe y puede entrar; perfil permite reenviar. No se anuncia un envío
cuando el proveedor está apagado. Google OAuth de identidad no concede permiso para mandar Gmail.

Token aleatorio de 32 bytes, huella SHA256 en SQL, vencimiento 30 min, reenvío mínimo 60 s por cuenta
y rate limit por ruta/IP. Enlace `/verify-email#token=...`: fragmento fuera de access logs/referrers.
GET/prefetch no verifica; la persona pulsa Confirmar, POST consume condicionalmente una sola vez.
El enlace no inicia sesión ni cambia contraseña. Cada reenvío sustituye el anterior. Idempotency-Key
del proveedor identifica el envío sin exponer el token. Un fallo invalida el token conservando cooldown.

Prueba autorizada contra la dirección oficial sandbox `delivered@resend.dev`: HttpClient .NET 10 recibió
HTTP 200 y un ID; datos sintéticos sin cuentas/tokens reales. No se probó llegada a un inbox real.
La entrega observada por esta API significa aceptación del proveedor, no llegada garantizada al inbox.
Faltan pruebas de entrega/spam, rebotes y cuotas reales. Antes de lanzamiento público, verificar Google
web/Android, resend, enlace en navegador externo y en app, expiración y cuenta en otro dispositivo.

Endpoint autenticado `POST /api/v1/auth/email/request`; confirmación pública limitada
`POST /api/v1/auth/email/confirm`. Campos nuevos son nullable y migración aditiva. Cuentas anteriores
no se marcan verificadas por antigüedad. Rollback de binario conserva columnas; no ejecutar Down sobre datos vivos.

Fuente de adapter: [API oficial enviar correo](https://resend.com/docs/api-reference/emails/send-email).
