# Vista web local

ONDA mantiene React Native/Expo para generar binarios nativos Android/iOS.
La vista web comparte estado, catálogo, biblioteca y lógica de reproducción. Desde 1000 px tiene
pantallas específicas de escritorio (menú lateral, columnas, mapa con panel y reproductor fijo).
En móvil usa las pantallas táctiles. El mapa utiliza world.web.tsx con MapLibre GL JS.

Terminal 1, desde la raíz: `./scripts/start-web-api.ps1`.
Terminal 2: `npm --prefix apps/mobile run web -- --localhost`.
Abrir http://localhost:8081. Para entrar desde otro dispositivo se necesita configuración adicional.

La API permite CORS únicamente a localhost/127.0.0.1:8081, y solo en Development.
SQL Server mantiene Encrypt=true. Con SQL Server Express local (certificado autofirmado) los scripts usan
TrustServerCertificate=true; en un servidor con certificado válido, definir ConnectionStrings__Onda con false.
El servidor web genera/copía worker, módulo compartido y fuente de iconos desde las dependencias
instaladas mediante scripts/prepare-web.cjs. No se suben node_modules ni copias generadas a Git.
Estas dependencias conservan sus licencias originales (MapLibre BSD-3, Ionicons MIT).

Audio comienza con una acción del usuario. Algunas radios/HLS pueden no funcionar en todos los
navegadores por codecs o políticas del origen; no se retransmite audio desde el backend.
Favoritos se guardan en almacenamiento local del navegador y no se sincronizan con el teléfono.
El mapa web (world.web.tsx) comparte con Android la lógica de viewport, clusters del servidor, panel y selección
(src/world.tsx). Verificado en el navegador integrado: centrado en el país, clusters, zoom al tocar y lista sincronizada.
En Windows las banderas emoji se muestran como letras (limitación de las fuentes del sistema).
El temporizador, Bluetooth, notificación y segundo plano deben validarse en Android real.

Exportación web: `npm --prefix apps/mobile run export:web`.
No hay despliegue público ni publicación en Play Store.

## ONDA Experience 0.7.1

Tema Inmersivo ONDA predeterminado con ondas estáticas; sin imágenes remotas decorativas ni animación
continua de fondo. Temas claro/oscuro/automático disponibles en Ajustes. País de escucha sugerido por
zona horaria/idioma y modificable, sin GPS; Inicio incluye radios nacionales, favoritas e historial antes
del descubrimiento mundial. Los contenedores de pestañas inactivas permanecen montados para conservar
estado, pero se ocultan visualmente para no traslucirse tras el fondo inmersivo.
