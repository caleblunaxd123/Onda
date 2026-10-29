# Biblioteca portátil y Tierra ONDA — 0.7.3

## Respaldo

Biblioteca → icono de descarga/Respaldo, o Ajustes → Respaldo de tu biblioteca.
Exporta un JSON con favoritas y colecciones; Android permite elegir un archivo con el selector
del sistema y la web lo descarga. No requiere cuenta, almacenamiento general, ni subirlo a ONDA.
El usuario decide si guarda el archivo en su dispositivo o en un proveedor propio.

Importar muestra una confirmación antes de combinar. Conserva orden y datos existentes;
combina colecciones por nombre, evita emisoras repetidas y asigna IDs locales a colecciones nuevas.
No importa historial, ajustes, búsquedas ni credenciales. Reimportar es idempotente.
Valida formato/versionado, campos permitidos y HTTPS; rechaza archivos de más de 5 MiB,
más de 500 favoritas, 100 colecciones o 500 radios por colección. Si la combinación rebasa los
límites, no modifica la biblioteca. El archivo es legible: no incluye audio ni se cifra automáticamente.
No equivale a sincronización automática ni recuperación después de perder el dispositivo sin exportar.

## Acceso rápido Android

Ajustes → Tus radios, a un toque → Añadir widget de favoritas. Confirmar en el launcher.
Si no admite fijación desde la app: mantener pulsado el escritorio → Widgets → ONDA.
El widget redimensionable muestra las tres primeras favoritas. También son accesos al mantener
pulsado el icono ONDA. Se actualizan cuando cambia la biblioteca, sin sondeos ni descargas periódicas.

Tocar una emisora abre ONDA y empieza a escuchar con el mismo reproductor global. No hay otro
motor de audio en el widget ni botón que simule controlar una sesión inexistente.
Los enlaces solo contienen un ID; únicamente reproducen una favorita guardada en ese dispositivo.
Un acceso obsoleto muestra un mensaje y permite volver a Biblioteca. Las favoritas eliminadas
se retiran de accesos dinámicos y se deshabilitan en accesos fijados.

Implementación: módulo Expo local `modules/onda-quick-access`; no editar Android generado. El config plugin `plugins/withOndaDeepLinks.cjs`
conserva el intent más reciente en MainActivity para restauraciones de tarea.
También integra ACTION_CREATE_DOCUMENT para guardar JSON con un destino elegido por el usuario.

## Globo y exploración

La referencia visual es [Radio Garden](https://radio.garden/): planeta protagonista, puntos pequeños
y panel compacto. El renderizador propio usa MapLibre GL JS 6.14 con proyección esférica,
compartido por iframe web y una WebView aislada en Android. Script y worker se empaquetan desde
las dependencias instaladas con `scripts/prepare-globe.cjs`, sin descargar código de terceros al abrirlo.

Las imágenes son el mosaico histórico **NASA GIBS Blue Marble Shaded Relief and Bathymetry**,
no satélite en directo ni fotografía de calles. Resolución máxima zoom 8; al acercarse más puede
perder detalle. El botón Mapa cambia a OpenFreeMap Liberty, con calles y nombres. Ambos conservan
la cámara y la esfera. Atribución visible. No usa claves Google, GPS ni activa facturación.

Desde 0.7.4, el globo incluye nombres de países de OpenFreeMap/OpenMapTiles, priorizando `name:es`
y después nombre latino/local. Los textos blancos llevan halo y control de colisiones; países pequeños
aparecen según zoom para mantener legibilidad. Fuente vectorial acotada a zoom 5 y etiquetas hasta zoom 10.
La alternativa de calles también prioriza español cuando sus datos contienen traducción. No todos los
accidentes geográficos tienen traducción; se conserva el nombre disponible. Los nombres son cartografía,
no se derivan de coordenadas de emisoras. Datos/glifos se solicitan a OpenFreeMap con atribución visible.

- [NASA: acceso a GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
- [NASA: uso con bibliotecas de mapas](https://nasa-gibs.github.io/gibs-api-docs/map-library-usage/)
- [MapLibre: globo y atmósfera](https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-an-atmosphere/)
- [OpenFreeMap](https://openfreemap.org/quick_start/)

Puntos menta pequeños, sin burbujas grandes ni números sobre el territorio. La agrupación del
servidor se conserva: al tocar un punto agrupado se acerca; una emisora individual se selecciona.
No se inventan ubicaciones. El área visible puede agrupar estaciones por celda; se pide una
granularidad mayor conservando el límite existente de 1200 celdas y el recuento del servidor.
El hitbox táctil de 44 px es mayor que el punto visible.

En celular la lista se abre desde abajo y se cierra con Volver al globo. En escritorio queda al lado.
Buscar país abre selección con filtro y después permite elegir Ciudad. Continúa el acceso a
emisoras sin coordenadas. El selector de país no usa GPS ni determina la ciudad del usuario.
El puente del renderizador solo admite cámara, datos de puntos y selección de IDs presentes;
no expone reproducción, archivos ni cuentas. CSP acota recursos a NASA/OpenFreeMap.
Sin WebGL o sin imágenes, se informa y queda disponible la lista.

## Próximo valor agregado: identificación de canciones

Petición del usuario: reconocer qué canción suena sin abrir Shazam, también al escuchar desde PC.
Ya hay metadatos ICY cuando la radio los transmite. **Esta versión no incorpora reconocimiento
de audio.** Evaluar una acción explícita bajo demanda, breve muestra en memoria, caché por emisora,
límites/coste y derechos del proveedor antes de conectar un servicio. No activar suscripciones
ni guardar grabaciones de forma continua. No confundir ausencia de ICY con reconocimiento hecho.

## Validación

62 pruebas del cliente, tipos/lint y export web. Incluyen respaldo Unicode, límites, URLs inseguras,
combinación sin pérdidas, idempotencia y mensajes del puente. API y SQL no cambian.
El propietario reportó funcionamiento correcto de la versión anterior en tres teléfonos físicos;
no es una prueba física realizada por el agente ni valida todavía este nuevo widget/globo.
Resultados y límites de la candidata publicados en PROGRESS/TESTING/DEPLOYMENT;
el widget con proceso cerrado requiere validación física por cierres del emulador QEMU.
