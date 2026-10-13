# Vista web local

ONDA mantiene React Native/Expo para generar binarios nativos Android/iOS.
La vista web comparte pantallas, estado, catálogo y lógica de reproducción; el mapa tiene una
implementación específica world.web.tsx con MapLibre GL JS.

Terminal 1, desde la raíz: `./scripts/start-web-api.ps1`.
Terminal 2: `npm --prefix apps/mobile run web -- --localhost`.
Abrir http://localhost:8081. Para entrar desde otro dispositivo se necesita configuración adicional.

La API permite CORS únicamente a localhost/127.0.0.1:8081, y solo en Development.
SQL Server mantiene Encrypt=true y TrustServerCertificate=false en el script de vista web.
El servidor web genera/copía worker, módulo compartido y fuente de iconos desde las dependencias
instaladas mediante scripts/prepare-web.cjs. No se suben node_modules ni copias generadas a Git.
Estas dependencias conservan sus licencias originales (MapLibre BSD-3, Ionicons MIT).

Audio comienza con una acción del usuario. Algunas radios/HLS pueden no funcionar en todos los
navegadores por codecs o políticas del origen; no se retransmite audio desde el backend.
Favoritos se guardan en almacenamiento local del navegador y no se sincronizan con el teléfono.
El temporizador, Bluetooth, notificación y segundo plano deben validarse en Android real.

Exportación web: `npm --prefix apps/mobile run export:web`.
No hay despliegue público ni publicación en Play Store.
