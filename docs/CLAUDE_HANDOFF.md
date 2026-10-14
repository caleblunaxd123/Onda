# Continuación de ONDA — beta 0.5

```text
Continúa https://github.com/caleblunaxd123/Onda, rama codex/onda-modules-contabo, PR #1.
Responde al propietario en español. Antes de editar: git fetch, status/diff y AGENTS.md aplicables.
Lee PROGRESS, TESTING, DEPLOYMENT, provider-compatibility y GOOGLE_SIGN_IN. Verifica el código actual;
no uses documentos históricos para volver a funciones que el propietario retiró.

Objetivo: multimedia social fácil de entender. Inicio = salas públicas/mis salas, invitación y crear.
Radio está en otra pestaña; conserva catálogo SQL, Mundo, Radar, biblioteca y ONDA AI.
Identidad ONDA, azul gris suave; usa la simplicidad de Rave como referencia, sin copiar su marca.
Flujo aceptado: Crear sala → fuente → entrar automáticamente → buscar/elegir en la sala.
YouTube Android ya usa navegador público integrado y player IFrame oficial. Ver juntos o añadir a cola
desde el explorador; invitados proponen, anfitrión/coanfitrión controla. No añadir formularios duplicados.
Web busca en pestaña externa y pega enlace, hasta que haya YouTube Data API; no inventar API keys.
Otros servicios usan enlace oficial externo y reloj MANUAL: no afirmar integración Netflix/Disney/Prime.

Decisión más reciente de chat: NO fotos, NO archivos, NO grabaciones/notas de voz nuevas.
Subidas deshabilitadas también en servidor antes de multipart. Mantén acceso privado/retención de adjuntos
legado; no los borres indiscriminadamente. Mensajes, respuestas, reacciones, editar/borrar, un pin por sala,
stickers incluidos enviados por ID pequeño. No guardar nuevos blobs ni habilitar Chat:AllowedKinds.
Voz solicitada es EN VIVO, sin grabar: todavía pendiente WebRTC + TURN. Prioriza consentimiento al pulsar,
mute, abandonar voz, atenuación local de música y límites de participantes/tráfico. No presentar como terminado
hasta verificar dos clientes reales y red móvil. No usar notas de voz como sustituto de RTC.

Google preparado en cliente Android/web y backend (Google.Apis.Auth), nonce de un solo uso y vinculación por sub.
El propietario NO tiene proyecto/IDs OAuth; mantener desactivado. Sigue GOOGLE_SIGN_IN al recibir IDs públicos;
no simules login con un campo Gmail ni vincules cuentas por coincidencia de correo. Preserva ID del invitado.

Producción web https://onda.lunalav.pe; API https://onda-api.lunalav.pe; APK 0.5.0 build=7.1.
Contabo /opt/onda, API onda-api:20261014-light-social, Caddy/Cloudflare y SQL Server dedicado Onda;
no sustituir SQL por PostgreSQL ni tocar otros servicios. GoogleIdentity ya migrada explícitamente después
de respaldo cifrado/restauración comprobada. Secretos solo en archivos privados, jamás imprimir/versionar.
No parar stack compartido, no borrar volúmenes, cuentas reales o sala AndroidQA del propietario.
API local 5080/build dev se conservaron; no asumir que ya tienen este esquema/binario nuevo.

Verifica npm run check:mobile (87 pruebas) y backend SQL real (140). Si DLLs bloqueadas por API local,
usa dotnet test ... --artifacts-path en una carpeta .tools dedicada. SDK Expo 57/RN 0.86.3:
consulta docs de esa versión, hooks de expo-router, instala dependencias con expo install y regenera nativo;
prebuild limpia por defecto, --no-clean mantiene carpeta/caché. No editar android/ios a mano.
Prueba en emulador autorizado con install -r, sin borrar cuenta/biblioteca. QA debe ser propia, con IDs/códigos
guardados solo en .tools y limpieza verificada; jamás borrar un usuario solo porque su nombre contiene QA.

Pendientes posteriores: expo-video HLS nativo, pruebas Android físicas/Bluetooth/batería/reconexión,
firma para tiendas, correo transaccional, backups externos/alertas. No dar por aceptado MVP solo porque compila.
Por incremento entrega código, pruebas apropiadas, evidencia real, documentos vigentes y commit/push.
Cambios, pruebas, GitHub y despliegue ya autorizados; pregunta solo por datos imprescindibles nuevos.
```
