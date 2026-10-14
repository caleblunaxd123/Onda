# Auditoría — 2026-10-13

NuGet: última auditoría sin paquetes vulnerables. Reproducir con SDK 10:
`dotnet list backend/Onda.slnx package --vulnerable --include-transitive`.

npm: **19 high**, todos en cadenas de herramientas de Expo/Metro; auditoría pendiente de resolución completa.
La cadena uuid de xcode se resolvió anteriormente con override a CommonJS uuid 11.1.1.

Se corrigieron los 3 avisos moderate de decode-uri-component (GHSA-vcc3-ghjq-m6fr): el paquete upstream 0.5.0
es ESM y query-string 7 de Expo Router 57 lo requiere como CommonJS. `vendor/decode-uri-component` conserva
el código MIT de 0.5.0, adapta únicamente su export y mantiene la licencia. Dependencia file + override explícito;
sin modificar node_modules a mano. Dos pruebas cubren enlaces/Unicode y 20.000 secuencias UTF-8 malformadas.
Retirar el adaptador cuando Expo soporte el paquete upstream directamente.

Pendientes:
- braces ≤3.0.3, GHSA-vfj7-8cjw-p6xm: sin versión corregida publicada; cadena Metro.
- node-forge ≤1.4.0, GHSA-86w9-cpqp-85rv: sin versión corregida publicada; CLI/certificados Expo.
- Los avisos en Expo/React Native/Reanimated/Worklets/MapLibre propagan estas dependencias de herramientas.

No usar `npm audit fix --force`: propone degradaciones incompatibles con SDK 57. Revisar compatibilidad y
recompilar antes de una actualización mayor. SignalR 10.0.11/WebView 13.16.1 instalados para la beta.
0.4 añade con `npx expo install`: expo-image-picker ~57.0.20 (fotos; permiso de cámara bloqueado) y
expo-image-manipulator ~57.0.21 (re-codificación local). Ya estaban expo-audio (grabación), expo-document-picker,
expo-file-system (subida/descarga con progreso) y expo-sharing. Cambian permisos nativos: RECORD_AUDIO se declara
y solo se solicita al tocar grabar; CAMERA y WRITE_EXTERNAL_STORAGE siguen bloqueados.
No afirmar que la auditoría está limpia.
