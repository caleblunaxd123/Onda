# Activar Continuar con Google

Estado al 14 de octubre de 2026: **activado en la API de producción y probado con acceso real en Android**.
El propietario autorizó crear OAuth y aceptar la política de Google. Proyecto `onda-511605`
(número `349721745900`), marca ONDA, audiencia externa en **Prueba**, una cuenta de prueba autorizada.
La API anterior permanece desplegada; los cambios de moderación 0.6.1 son una candidata separada.

Clientes públicos (no son secretos):
- Web: `349721745900-mib2jvdhbe0khjhnr7k7ard8fr89edhq.apps.googleusercontent.com`.
- Android beta: `349721745900-gknsj1gd4vakf7s618uve7rl4onio409.apps.googleusercontent.com`.
- Origen `https://onda.lunalav.pe`, paquete `app.onda.radio`, certificado beta indicado abajo.
- Marca: página principal ONDA, privacidad `/privacy`, dominio autorizado `lunalav.pe`.

La API lee el cliente Web mediante `GOOGLE_WEB_CLIENT_ID` en `compose.env`. Solo se recreó el
contenedor ONDA API con comprobación y rollback preparado; no se tocaron SQL ni otros servicios.
No se descargó ni guardó el client secret, innecesario para este flujo de ID tokens.

Verificado: selector de cuentas Android, cuenta autorizada, respuesta de la API y «Cuenta conectada
con Google». La web carga el botón oficial; su popup no completó el acceso en el navegador integrado.
No presentar ese recorrido como login web verificado. La candidata renueva el nonce de la web cada
cuatro minutos y usa el botón FedCM sin selección automática; validar después en Chrome físico.

## Registro realizado y pendientes de plataforma

1. **Hecho:** proyecto y pantalla de consentimiento en Google Cloud. Durante pruebas, agregar las cuentas
   de prueba autorizadas. Solicitar solamente identidad básica (OpenID, correo/perfil), sin Gmail/Drive.
2. **Hecho:** cliente OAuth **Web**, con origen autorizado `https://onda.lunalav.pe`.
   La web usa Google Identity Services con callback JavaScript; el token se verifica en ONDA.
3. **Hecho para beta principal:** cliente OAuth **Android**, paquete `app.onda.radio`, con huella SHA-1:
   `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
   Para el build de desarrollo, registrar también `app.onda.radio.dev` con su huella correspondiente.
   La firma de tiendas será diferente: registrar luego las huellas de upload y Play App Signing.
4. **Hecho en producción:** `Google__WebClientId` con el ID Web público. Android Credential Manager
   solicita tokens para ese ID; el cliente Android de Google Cloud valida paquete/huella.
   No hace falta poner un client secret en el APK o la web. Reiniciar solo ONDA y verificar `/api/v1/auth/providers`.
5. Para iOS crear cliente propio, configurar `Google__IosClientId` en API y
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` al compilar. `app.config.ts` registra su esquema invertido mediante
   el plugin Nitro. iOS no fue compilado/probado en esta entrega.

El SDK Android está incluido desde 0.5.0. Con la configuración actual, el botón se habilita al consultar
la API. iOS, cliente del paquete `.dev`, firma Play App Signing y publicación OAuth fuera de Prueba
siguen pendientes. No activar acceso a Gmail, Drive, contactos ni scopes sensibles.

## Contrato implementado

- `GET /api/v1/auth/providers`: disponibilidad e IDs públicos; sin claves privadas.
- `POST /api/v1/auth/google/challenge`: nonce aleatorio, válido cinco minutos y de un solo uso.
- `POST /api/v1/auth/google`: JSON `{idToken, nonce}`. Nunca tokens en URLs ni logs.
- `Google.Apis.Auth` verifica firma, audiencia, emisor y expiración; ONDA exige correo verificado y nonce.
- Identidad persistida por `GoogleSubject` (`sub`), con índice único. No tomar ni unir una cuenta existente
  por coincidencia de correo. El usuario debe autenticarse primero para vincular su cuenta de correo.
- Upgrade de invitado conserva su ID/nombre y revoca sesiones anteriores. Si ya existe identidad Google,
  se entra en esa identidad; un vínculo desde otra cuenta registrada se rechaza.
- Una cuenta Google nueva recibe código privado de recuperación. Puede usarlo para establecer contraseña
  o confirmar eliminación. No hay envío de correo transaccional todavía.
- Migración `20261014041500_GoogleIdentity`: columna nullable e índice único filtrado; ya aplicada en Contabo
  tras respaldo/restauración. No borra ni cambia las cuentas actuales.

## Validación complementaria pendiente

Probar con cuentas de prueba: login nuevo y repetido, selección/cancelación de cuenta, Google Play Services
no disponible, offline, challenge vencido/reutilizado, token falso/audiencia ajena, upgrade del invitado con
biblioteca/salas preservadas, correo coincidente con cuenta de contraseña y vínculo desde cuenta incorrecta.
Comprobar revocación y eliminación por código/contraseña. No marcar login real probado solo por compilar.

Referencias oficiales: [Expo](https://docs.expo.dev/guides/google-authentication/),
[Nitro Google Sign-In](https://react-native-nitro-google-sign-in.github.io/docs/guide/usage/),
[verificación Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
