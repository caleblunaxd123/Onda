# Activar Continuar con Google

Estado: preparado en ONDA 0.5, **desactivado en producción**. El propietario confirmó que aún no tiene
proyecto/clientes OAuth. No se realizó login con una cuenta Google real ni se inventaron IDs.

## Configuración que falta

1. Crear proyecto y pantalla de consentimiento en Google Cloud. Durante pruebas, agregar las cuentas
   de prueba autorizadas. Solicitar solamente identidad básica (OpenID, correo/perfil), sin Gmail/Drive.
2. Crear cliente OAuth **Web**, con origen autorizado `https://onda.lunalav.pe`.
   La web usa Google Identity Services con callback JavaScript; el token se verifica en ONDA.
3. Crear cliente OAuth **Android**, paquete `app.onda.radio`, con huella SHA-1 del certificado de la beta:
   `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
   Para el build de desarrollo, registrar también `app.onda.radio.dev` con su huella correspondiente.
   La firma de tiendas será diferente: registrar luego las huellas de upload y Play App Signing.
4. En la API configurar `Google__WebClientId` con el ID Web público. Android Credential Manager
   solicita tokens para ese ID; el cliente Android de Google Cloud valida paquete/huella.
   No hace falta poner un client secret en el APK o la web. Reiniciar solo ONDA y verificar `/api/v1/auth/providers`.
5. Para iOS crear cliente propio, configurar `Google__IosClientId` en API y
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` al compilar. `app.config.ts` registra su esquema invertido mediante
   el plugin Nitro. iOS no fue compilado/probado en esta entrega.

El SDK Android ya está incluido en el APK 0.5.0. Sin IDs, el botón muestra «Google estará disponible pronto»
y permanece desactivado. No debe habilitarse solo para aparentar que funciona.

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

## Validación pendiente después de configurar

Probar con cuentas de prueba: login nuevo y repetido, selección/cancelación de cuenta, Google Play Services
no disponible, offline, challenge vencido/reutilizado, token falso/audiencia ajena, upgrade del invitado con
biblioteca/salas preservadas, correo coincidente con cuenta de contraseña y vínculo desde cuenta incorrecta.
Comprobar revocación y eliminación por código/contraseña. No marcar login real probado solo por compilar.

Referencias oficiales: [Expo](https://docs.expo.dev/guides/google-authentication/),
[Nitro Google Sign-In](https://react-native-nitro-google-sign-in.github.io/docs/guide/usage/),
[verificación Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
