# Progreso — nombres de países, ONDA 0.7.4, 2026-10-29

Web y APK 0.7.4/code15 publicados desde `c3906b6` en la [PR #6](https://github.com/caleblunaxd123/Onda/pull/6),
apilada sobre #5. Conserva respaldo, widget y globo de 0.7.3.

- Nombres de países sobre las imágenes de la Tierra: español preferido y nombre local/latino como
  alternativa si no existe traducción. Tamaño progresivo, halo y colisiones evitan textos superpuestos;
  países pequeños aparecen al acercarse. Datos OpenFreeMap/OpenMapTiles/OSM, fuente vectorial hasta zoom 5.
- La vista alternativa de calles también prioriza español en las capas de etiquetas compatibles.
- Tipos/lint, 62 pruebas cliente, export web y APK correctos. CI backend/móvil de `c3906b6` correcta:
  [push](https://github.com/caleblunaxd123/Onda/actions/runs/40972714198) y
  [PR](https://github.com/caleblunaxd123/Onda/actions/runs/40972720397).
- QA visual en navegador de escritorio y 390×844: globo, nombres, zoom y cambio a calles, sin errores
  de consola. Capturas `web-074-countries-mobile.png` y `web-074-countries-production.png` en screenshots.
- Publicación estática con copias verificadas y rollback. API conserva su contenedor e imagen
  `onda-api:20261028-072-metadata`; sin cambios SQL/Compose/DNS ni reinicio.
- HTML (excluyendo solo beacon Cloudflare), JS/CSS y APK públicos coinciden con los artefactos locales.
  Ready 200 y feed Perú correctos. Registro privado `/opt/onda/releases/library-074-release.json`.
- APK: [0.7.4 build15.1](https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.7.4&build=15.1),
  119.676.648 bytes, SHA256 `c12f9a006f6e85628ceb33985eaf664c15c2727832c43847e136eedf28236080`.
  Firma beta anterior y tres ABI conservadas, sin GPS/micrófono ni permisos nuevos.
- No se repitió QA física para 0.7.4. Sigue pendiente probar el widget con proceso cerrado en teléfono:
  los cierres de QEMU descritos abajo impiden declararlo aprobado. Reconocimiento de audio sigue como propuesta.

Las notas siguientes son históricas.

# Progreso — biblioteca portátil y Tierra ONDA 0.7.3, 2026-10-29

Web y APK 0.7.3/code14 publicados desde `f370570` en la [PR #6](https://github.com/caleblunaxd123/Onda/pull/6),
apilada sobre #5. La API sigue en `onda-api:20261028-072-metadata`, mismo contenedor y tiempo de inicio.
Sin migraciones SQL, reinicios de API, servicios nuevos, DNS ni suscripciones.

- Respaldo JSON de favoritas/colecciones en Biblioteca y Ajustes; selector de guardado Android,
  descarga web, validación y confirmación antes de combinar. Conserva lo existente y evita duplicados.
  No sube archivos a ONDA ni exporta historial/ajustes/cuentas. Límite de 5 MiB.
- Widget Android 4×2, redimensionable, y accesos de launcher a las tres primeras favoritas.
  Abre el único reproductor; sin motor de audio adicional ni actualizaciones periódicas.
  IDs guardados exclusivamente. Corregidos categoría launcher e intent inicial al restaurar una tarea.
- Globo MapLibre esférico en web/Android, imágenes NASA Blue Marble, puntos pequeños y sin números
  sobre el territorio; vista alternativa de calles OpenFreeMap. Lista móvil desplegable, país/ciudad,
  hitbox mayor que el punto y filtros conservados. Son imágenes compuestas, no satélite en directo.
- Quitados del manifest permisos heredados de almacenamiento general, overlay y biometría;
  continúan HTTPS, tres ABI y misma firma beta, sin GPS/micrófono.
- 62 pruebas del cliente, tipos/lint, export web y APK correctos. CI de `f370570` correcta:
  [push](https://github.com/caleblunaxd123/Onda/actions/runs/40897293795) y
  [PR](https://github.com/caleblunaxd123/Onda/actions/runs/40897305999).
- QA web: exportar/reimportar, combinación idempotente, importar el respaldo real de Android,
  móvil 390×844, búsqueda Perú/Lima, calles y controles del globo. La web pública carga el globo nuevo
  tras recargar; HTML de todas las rutas principales y assets coinciden con el export.
- QA Android: instalación sobre la biblioteca anterior conservó Radio La Zona Urbana, RTL y su colección.
  Guardado mediante selector del sistema, reimportación sin duplicados, globo real y widget 4×2 comprobados.
  El widget abrió RTL y MediaSession indicó PLAYING durante la prueba con el proceso existente.
- **Pendiente:** confirmar el widget con el proceso cerrado en un teléfono físico. QEMU se cerró repetidamente
  con excepción Windows `0xc0000005` durante esta prueba, incluso con renderizado por software; no se
  declara aprobada. El enlace directo frío se reprodujo, pero no sustituye esa prueba del widget.
  Las correcciones de entrega de intents están compiladas; no se atribuye el fallo del emulador a teléfonos.
- El usuario reportó funcionamiento perfecto en tres teléfonos de la app previa; no constan modelos/versión
  exactos y no equivale a validación física de este nuevo widget/globo.
- Publicación con copias verificadas de index/APK anteriores y sustitución atómica. Registro privado
  `/opt/onda/releases/library-073-release.json`. Ready 200, API sin cambio de contenedor,
  APK público y JS/CSS coinciden con los artefactos locales. Capturas `docs/screenshots/*073*`.

APK: [0.7.3 build14.1](https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.7.3&build=14.1),
119.674.440 bytes, SHA256 `82cb274fe0c2aa91ec15cfbbc99812282b5832ae5cd42a965a9e7717bfa02eff`.
Sigue siendo beta con firma de depuración, no publicación en tiendas. Reconocimiento musical bajo demanda
solicitado por el usuario: propuesta documentada, sin proveedor configurado ni reconocimiento simulado.
Ver [funcionamiento y límites](LIBRARY_BACKUP_AND_GLOBE.md). Las notas siguientes son históricas.

# Progreso — canción actual y MediaSession 0.7.2, 2026-10-28

API, web y APK 0.7.2/code13 publicados desde `a11779c` (PR #5, apilada sobre #4).
API `onda-api:20261028-072-metadata`, sin migraciones SQL ni cambios de otros servicios del VPS.

- Texto ICY real, efímero, solo para la emisora/fuente activa; sin reconocimiento musical ni IA.
  Aparece en reproductor y barra inferior de web/Android. Fuentes sin ICY muestran título no disponible.
- MediaSession: canción como título, emisora como artista, logo o marca ONDA. El sistema controla
  apariencia/colores; no se impone una interfaz sobre el bloqueo. Ver `docs/NOW_PLAYING.md`.
- 107 pruebas backend con SQL real, 47 cliente, tipos/lint, export y APK correctos. CI `a11779c`:
  [push](https://github.com/caleblunaxd123/Onda/actions/runs/40802390154) y
  [PR](https://github.com/caleblunaxd123/Onda/actions/runs/40802511935), backend/móvil correctos.
- Candidata en Contabo contra SQL actual: ready, catálogo y canción de SomaFM correctos;
  rutas sociales siguen 404. Sondeos con DNS/IP pública fijada, HTTPS y presupuesto acotado.
- Corregida la caché HTTP general de cinco minutos: esta ruta usa NoCache/no-store y solo la
  caché breve específica de metadatos. Prueba de regresión incluida.
- Emulador: code13 instalado sobre code12 sin borrar favoritos. SomaFM publicó varios títulos;
  MediaSession y panel de ajustes rápidos mostraron canción, estación y artwork; el botón del
  sistema Pausa dejó la sesión PAUSED. No se afirma QA de bloqueo en teléfonos físicos ni de iOS.
- Respaldo cifrado `Onda-20261029T013714Z.bak.enc`, restauración en base separada y catálogo
  comprobados, además de archivo cifrado de adjuntos. Timestamp del archivo en UTC.
  Copias privadas env/index/APK en `/opt/onda/releases/metadata-072-before-*`; rollback documentado.
- HTML de la app comprobado excluyendo solo el beacon existente de Cloudflare; CSS/JS y APK públicos
  coinciden con el build. Marca ONDA de fallback devuelve 200 también con User-Agent Android.

APK: [0.7.2 build13.1](https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.7.2&build=13.1),
117.288.967 bytes, SHA256 `acb3a62700cde744ebb6bdf4890196386aa85c17234250c4ee5b6ac1c5ce9a0f`.
Firma beta compatible, tres ABI, HTTPS, sin GPS/micrófono. Pruebas físicas y tienda siguen pendientes.
Las notas siguientes son históricas.

# Progreso — ONDA Experience 0.7.1, 2026-10-28

Web y APK 0.7.1/code12 publicados desde `b439759` (PR #4, apilada sobre #3).
La API conserva `onda-api:20261028-070-radio`, sin reinicios ni cambios de SQL/migraciones.

- Web de escritorio desde 1000 px: navegación lateral, tarjetas compactas en columnas, búsqueda
  con filtros, mapa con panel derecho, biblioteca, Radar y reproductor fijo con volumen real.
- Inmersivo ONDA restaurado en Android/web: ondas estáticas cian, azul y violeta, superficies
  coherentes y navegación transparente. Actualización de antiguos temas oscuros una vez;
  las elecciones explícitas nuevas de claro/oscuro/automático se conservan.
- Inicio: destacada del país, favoritas de acceso rápido, emisoras nacionales, historial y
  descubrimiento mundial. País sugerido por zona horaria/idioma o elegido en Ajustes, sin GPS.
  Es una sugerencia de país; no detecta la ciudad ni acredita dónde vive una persona.
- Corregidos adaptador de iconos web, pestañas inactivas visibles tras fondos transparentes y
  desplazamiento del mapa por avisos de error. Colecciones conservan altas, renombrado y retiro de radios.
- 41 pruebas del cliente, TypeScript/ESLint y export web correctos. CI de código `b439759`:
  [push](https://github.com/caleblunaxd123/Onda/actions/runs/40780518853) y
  [PR](https://github.com/caleblunaxd123/Onda/actions/runs/40780586048), backend y móvil correctos.
- QA visual a 390/768/1440/1920 px, mapa real, búsqueda, reproducción de Radio Oxígeno,
  volumen/silencio, temporizador, favoritas persistentes y creación de colección local.
  Emulador actualizado sobre code11: favoritos Radio La Zona Urbana/RTL conservados, país
  modificado en Ajustes e inicio correspondiente, reproducción nativa observada EN VIVO.
- Copias de index/APK anteriores verificadas en `/opt/onda/releases/desktop-071-before-*`;
  sustitución atómica y API sin cambios. No se alteró ninguna otra aplicación del VPS.
- Comprobación pública: HTML de la app coincide al excluir el beacon existente de Cloudflare,
  CSS/bundle coinciden byte a byte, worker servido como JavaScript, consulta por país y ready 200;
  APK descargado de Cloudflare coincide en tamaño y SHA256. Captura `web-071-desktop-production.jpg`.

APK: [0.7.1 build12.1](https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.7.1&build=12.1),
117.284.423 bytes, SHA256 `753a8efa18a25da374750915fdd2c2e44ac6b158abfa4c56e7fa1e3e2ac47c43`.
Firma beta compatible, tres ABI, HTTPS, sin GPS/micrófono. Pruebas físicas y publicación en tienda pendientes.
Las notas siguientes son históricas.

# Progreso — radios mundiales, 2026-10-28

ONDA 0.7.0/code11 publicada con autorización del propietario. Se tomó `main` a97f976 y se añadió
la preparación de producción en 180c737 (PR #3). Inicio, Mundo, Radar y Biblioteca; sin cuentas,
salas, chat, video ni IA. Biblioteca local conservada al actualizar la beta con `install -r`.

API `onda-api:20261028-070-radio`, web exportada y APK público de 117.248.287 bytes. SQL no se migró
ni se borraron datos sociales. Respaldo cifrado con restauración independiente comprobada.
Ollama de ONDA detenido, volumen preservado; otros servicios conservan su actividad anterior.

69 pruebas backend SQL, 38 móviles, tipos/lint y CI correctos. API live/ready 200, CORS permitido
solo al origen configurado, rutas sociales 404, HTML idéntico al export/no-store/Cloudflare DYNAMIC,
bundles y APK públicos comparados. Catálogo: 69.768 registradas, 36.757 HTTPS, 220 países.
Smoke real de búsqueda/paginación/mapa/facetas correcto; no se enviaron reportes artificiales.

Emulador: actualización sin borrar datos, favorito RTL conservado, inicio mundial y reproducción
observada de Radio La Zona Urbana; web con mapa y Radio Oxígeno en vivo. No afirmar pruebas físicas
ni reproducción de todas las emisoras. Ver [despliegue](DEPLOYMENT.md) y [Play Store](PLAY_STORE_READINESS.md).
Las notas de abajo son históricas, no el estado de la publicación actual.

# Progreso — 2026-10-12

## Actualización 2026-10-13: logo, diseño del modelo, segundo plano y APK
- Logo oficial integrado (assets/brand): cabecera de marca en todas las pestañas, icono de app, icono adaptativo
  y monocromo de Android, splash (expo-splash-screen) y favicon. Paleta derivada del logo (cian → azul → violeta).
- Mundo según el modelo del propietario: cabecera con logo y onda, controles del mapa (mundo, acercar, alejar,
  centrar en mi país sin GPS), contador flotante con recuento real, panel con onda y recarga, chips en una fila,
  «Más filtros» (género e idioma aplicados a mapa y lista) y filas en tarjeta. Pestaña activa redondeada.
- Corregido: «Continuar escuchando» repetía emisoras que Radio Browser lista con distinto id (mismo stream o
  mismo nombre y país); ahora se deduplican al guardar y al mostrar. Corregido: reproducir una emisora la
  quitaba de la destacada y podía recargar Radar; la exclusión de recientes se fija al abrir la pantalla.
- Development Build recompilado e instalado (cambio nativo por icono/splash). Pruebas móviles: 37/37.
- Segundo plano en emulador (`dumpsys`): a los 20 s fuera de la app, sesión multimedia PLAYING, AudioTrack
  `started` y servicio `AudioControlsService` en primer plano con notificación de transporte. La comprobación a
  los 4,5 min no fue concluyente: la app volvió a primer plano durante la espera (sesión PLAYING y servicio activo,
  AudioTrack momentáneamente en pausa). Falta repetirla con pantalla bloqueada en un teléfono físico.
- APK de prueba para teléfono (release, bundle incluido, arm64-v8a y armeabi-v7a, 84 MB) apuntando a la API en la
  red local: `dist/ONDA-0.1.0-lan.apk` (no se versiona; se genera con `scripts/build-apk.ps1`).


## Continuación: catálogo, exploración, reproducción y rediseño
Base: commit 6e5ee85 (colecciones de la sesión anterior, confirmadas por separado para conservarlas).

### Catálogo y paginación (prioridad 1)
- `/api/v1/stations` devuelve `items`, `nextCursor`, `hasMore`, `source`, `total` (solo recuento real) y `stale`.
- Modo en vivo: `FilteredPaginator` avanza por registros consumidos de Radio Browser; una página filtrada vacía con
  `hasMore` no termina la lista; presupuesto de 4 solicitudes y 10 s; cancelación propagada.
- Cliente: `useStationFeed` acumula sin duplicados y en orden, sigue hasta 3 páginas vacías, tope de 600 en memoria,
  timeout propio, estados de carga/error/reintento y pie «Cargar más». Mundo y Radar usan carga progresiva.
- Solo HTTPS; si `url_resolved` es HTTP y `url` oficial es HTTPS, se usa la oficial.

### Catálogo persistente (prioridad 2)
- Migración `RelationalCatalog` (convierte el JSON anterior; `Down` lo reconstruye). Tablas Stations, StationTags,
  StationLanguages, SyncRuns, StationReports; índices de búsqueda, país, variantes y geográficos.
- Sincronización completa reanudable, por lotes, con bloqueo SQL y respaldo fila a fila. Primera ejecución real:
  **92.022 registros procesados, 67.991 emisoras** (43.923 HTTPS, 14.841 geolocalizadas, 9.046 variantes no principales,
  6.547 «inestables», 0 «caídas» con una sola observación). Se probó la reanudación real tras detener la API.
- Facetas reales: 242 países, ciudades por país, 200 idiomas y 200 géneros con etiquetas en español.
- Respaldo a SQL cuando falla la fuente; atribución a Radio Browser en Ajustes, mapa y reproductor.

### Explorar el mundo (prioridad 3)
- Consulta por área visible con debounce de 400 ms y cancelación; clusters agregados en SQL con recuentos exactos;
  zoom al tocar un grupo; selección sincronizada mapa↔lista; selector de país (límites reales) y ciudad;
  «Sin ubicación» para emisoras sin coordenadas. Android (MapLibre RN) y web (MapLibre GL JS) comparten lógica.
- Mapa OpenFreeMap con etiquetas en español; centrado inicial en el país de la persona, sin GPS.

### Búsqueda y descubrimiento (prioridad 4)
- Búsqueda paginada por nombre/ciudad con filtros combinables de país, idioma, género y ciudad; pestañas
  Todo/Emisoras/Países/Géneros/Ciudades; chips activos, «Limpiar filtros», búsquedas recientes, estados vacíos útiles.
- Ranking `Recommendations` conectado: perfil local (favoritos, colecciones, historial), semilla diaria, muestra de la
  cola larga y diversificación. Inicio y Radar priorizan el país detectado (zona horaria) con respaldo mundial.
- Onboarding de país y géneros. Sin oyentes, canciones, cuentas ni IA simulados.

### Reproducción y calidad (prioridad 5)
- Fuentes alternativas (principal + variantes HTTPS), 2 intentos por fuente (4 con una sola), máximo 6, reintento manual.
- Un único stream al cambiar rápido (probado con 20 cambios). Estados «Conectando…», «Cargando audio…», «En vivo».
- Temporizador comprobado también en eventos nativos (corrige un fallo real detectado por las pruebas: el mismo
  evento volvía a marcar «reproduciendo»). Lockscreen con `isLiveStream` y limpieza de controles al liberar.
- Reportes de problemas persistidos en SQL con alcance explicado en la app; probado desde el emulador.
- Favoritos y colecciones se refrescan con datos del catálogo una vez al día sin perder emisoras.

### Diseño
- Rediseño completo según la referencia: cabeceras uniformes, tarjeta destacada con degradado, ánimos en pastel,
  filas con estado real, hojas inferiores, miniplayer flotante, reproductor inmersivo con ondas y ecualizador
  decorativos (solo con reproducción real; respetan «reducir movimiento»), temas claro/oscuro.
- Saludo según hora local; el emulador estaba en GMT y se ajustó a America/Lima.

### Verificado realmente
| Control | Resultado |
|---|---|
| Backend `dotnet test` (Release, SQL Server Express) | 62/62 aprobadas (10 de integración SQL) |
| Móvil TypeScript, ESLint, Vitest | Correcto, sin avisos; 36/36 aprobadas |
| Migraciones en `.\SQLEXPRESS` base `Onda` | Aplicadas; readiness 200 |
| smoke-api.ps1 -Report | PASS: modo catálogo, 38.788 reproducibles, Perú total 310, 4 páginas sin duplicados, celdas = total |
| Emulador Android (Development Build existente) | Pantallas verificadas con capturas en docs/screenshots |
| Web (navegador integrado) | Mapa, clusters, zoom y lista verificados |
| NuGet vulnerable | Ninguno |
| npm audit | 22 avisos (antes 29); ver DEPENDENCIES.md |

No verificado: audio audible, Bluetooth, llamadas, batería, memoria, background prolongado, TalkBack, dispositivo físico.

### Pendiente o bloqueado
- Pruebas físicas de TESTING.md; proveedor de mapas con licencia para producción; búsqueda de texto completo.
- Cuentas, sincronización de biblioteca, salas e IA no iniciadas (siguen las condiciones del roadmap).
- Revisión de reportes: solo se almacenan; falta herramienta interna de moderación.
- Avisos npm sin parche compatible con SDK 57.

---
Historial anterior:


## Continuación: biblioteca y emulador Android
- Repositorio descargado desde origin/main, commit base 7baa666.
- Biblioteca con Favoritos, Historial y Colecciones, búsqueda local y estados vacíos.
- Colecciones persistentes: crear, renombrar, eliminar, añadir/quitar emisoras sin duplicados.
  Guardado disponible desde las filas del catálogo y el reproductor; las bibliotecas anteriores
  mantienen favoritos, historial y preferencias. El borrado local incluye las colecciones.
- Inicio con cuatro emisoras destacadas seleccionables; favoritos con corazón rojo,
  miniplayer compacto y tema automático como valor inicial en instalaciones nuevas.
- Reparado package-lock.json: faltaban @emnapi/core y @emnapi/runtime; npm ci ejecutado correctamente.
- Corregido init-localdb.ps1 para restaurar paquetes antes de la migración en un clon nuevo.
- Corregido un espacio JSX en búsqueda que provocaba un aviso de texto fuera de Text.
- .NET SDK 10.0.401 instalado localmente en .tools/dotnet (ignorado por Git); SQL Server
  OndaDev/Onda inicializado, migración aplicada y API local iniciada en localhost:5080.
- Comprobaciones actuales: TypeScript y ESLint correctos; 15 pruebas móvil y 16 backend aprobadas;
  smoke-api.ps1 aprobado con catálogo real, readiness SQL, UUID únicos y streams HTTPS.
- Development Build Android compilado e instalado realmente en emulator-5554,
  Medium_Phone_API_36.1. APK local: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk.
- Inicio y catálogo real renderizados; creación de colección, guardado de RTL y favorito
  comprobados en la interfaz nativa. Colección y favorito conservados tras cierre forzado y reapertura.
  Verificación equivalente de creación/guardado realizada en web.
- Captura real de la biblioteca Android: [android-library.png](android-library.png).
- No equivale a una beta aceptada: faltan las pruebas físicas de audio, Bluetooth, background,
  rendimiento y accesibilidad de TESTING.md. Salas e IA siguen pendientes.

Los apartados siguientes documentan la entrega inicial; sus limitaciones de SDK/compilación Android
quedan reemplazadas por esta actualización. Las pruebas físicas siguen pendientes.

## Actualización: vista web y publicación del código
- Vista web ejecutada y revisada en http://localhost:8081, con ancho móvil y el mismo backend SQL Server.
- Inicio con emisoras reales, mapa mundial con clusters y reproducción/pausa comprobados en la interfaz del navegador.
- Iconos web servidos localmente; worker MapLibre web separado para compatibilidad con Metro.
- Captura de referencia de la implementación real: web-preview.jpg.
- API iniciada con Encrypt=true y TrustServerCertificate=false; readiness y smoke reales aprobados.
- La variante web no cambia el destino Android/iOS nativo ni valida reproducción en segundo plano móvil.
- El propietario autorizó subir el código a https://github.com/caleblunaxd123/Onda.
- Instrucciones de ejecución: WEB_PREVIEW.md.
- Verificación posterior: 16 pruebas backend (incluido CORS) y 10 pruebas móvil aprobadas.

## Tarea actual
Primera implementación de ONDA con catálogo real y SQL Server; adaptación a referencia visual recibida.
**MVP incompleto: no declarar aceptadas las fases 0–4 como conjunto.**

## Implementado
- Monorepositorio inicial, Expo 57/TypeScript y solución modular ASP.NET Core 10.
- SQL Server LocalDB: instancia exclusiva OndaDev, base Onda y migración InitialSqlServerCatalog aplicada.
- API versionada de catálogo y estados de ánimo; validación, ProblemDetails, rate limit y caché 5 min.
- Radio Browser: discovery DNS oficial, hosts restringidos, timeouts/reintentos, normalización, UUID estable,
  persistencia progresiva con upsert SQL Server y filtrado de streams HTTPS.
- Audio Expo real conectado al motor único global; eventos nativos, estados, cleanup, backoff y conectividad.
- Configuración nativa de background y lockscreen; ausencia de permisos de micrófono/GPS.
- Inicio editorial, búsqueda cancelable con debounce, países/géneros/idiomas, favoritos/historial local,
  mapa inicial con clustering, Radio Radar vertical, reproductor completo, ajustes y temas.
- Referencia visual conservada en docs/design-reference.png; carruseles, grid de ánimos,
  tarjetas superpuestas, controles circulares y panel contextual incorporados.
- Biblioteca local persistida; historial registrado cuando el audio informa playing.
- Dockerfile/Compose SQL Server, scripts Windows, CI y documentación.

## Archivos modificados / creados
Repositorio previamente vacío. Código en apps/mobile/app y apps/mobile/src;
backend/Onda.Api, Onda.Application, Onda.Domain, Onda.Infrastructure y Onda.Tests;
configuración en compose.yaml, scripts, infra, .github/workflows/ci.yml;
README y documentación de arquitectura, producto, diseño, roadmap, decisiones, pruebas y despliegue.

## Verificado realmente
| Control | Resultado |
|---|---|
| dotnet build Release | Correcto, 0 advertencias y 0 errores |
| dotnet test Release | 14 pruebas aprobadas |
| TypeScript tsc --noEmit | Correcto |
| ESLint | Correcto, sin avisos en última ejecución |
| Vitest | 10 pruebas aprobadas: audio, favoritos, historial y rehidratación |
| Expo doctor | 21/21 comprobaciones aprobadas en última ejecución |
| expo export --platform android | Bundle Hermes generado (1.871 módulos), también tras cambios visuales |
| expo prebuild --platform android --no-install | Proyecto Android generado |
| Migración SQL Server | Aplicada realmente a OndaDev/Onda |
| /health/ready | HTTP 200, conexión real a SQL Server |
| smoke-api.ps1 | Readiness, catálogo real, UUID únicos, HTTPS y validación HTTP: PASS |
| Persistencia | 10 filas / 10 UUID únicos después de consultas repetidas |
| NuGet audit, transitivas incluidas | Sin vulnerabilidades detectadas |
| npm audit tras fix compatible | 29 paquetes señalados: 19 high, 10 moderate; documentados en DEPENDENCIES.md |

Cuatro URLs del catálogo consultadas con GET hasta recibir encabezados:
Radio RPP Noticias (200 audio/aac), Radio Oxígeno (200 application/vnd.apple.mpegurl),
Radio Exitosa (200 audio/aac), Onda Cero Te Activa (200 audio/aac).
Esto NO demuestra reproducción audible ni disponibilidad futura; no se descargó ni grabó audio.

## Errores corregidos
- Certificado corporativo de Expo: NODE_USE_SYSTEM_CA=1, sin desactivar validación TLS.
- Peer incompatible React DOM 19.3: alineado con React 19.2.3 del SDK.
- OpenAPI vulnerable del template actualizado.
- Evento de MapLibre corregido a nativeEvent.features.
- Pausa de lockscreen respetada frente a cambios posteriores de conectividad.
- Peers expo-font/expo-asset y expo-system-ui incorporados.

## Bloqueos y limitaciones
- Intento real de npm run android -- --no-install falla: Android SDK no encontrado y adb ausente.
  No se generó APK ni se probaron emulador/dispositivo, audio audible, background o Bluetooth.
- No se validaron FPS, memoria, batería, accesibilidad ni apariencia renderizada en Android.
- Docker no está disponible: Compose preparado, no ejecutado.
- Auditoría npm pendiente: ver DEPENDENCIES.md; no forzar downgrade incompatible.
- Mapa inicial por país/muestra, no consulta completa por viewport/ciudad/continente.
- Una URL por emisora; no hay resolución de streams alternativos todavía.
- Temporizador JS requiere validación con la app suspendida.
- Falta esquema relacional ampliado, colecciones, reporting, cuenta/JWT/refresh, sincronización y borrado de cuenta.
- Motor determinístico de ranking existe y está probado; personalización completa aún no conectada.
- Salas es un estado explícito de próxima fase; Social y ONDA AI no implementados.
- Bundle/configuración no equivalen a aceptación MVP.

## Próxima tarea
Configurar Android SDK/JDK y emulador o teléfono, compilar Development Build, validar UI con
docs/design-reference.png y ejecutar matriz física de docs/TESTING.md. Después completar mapas,
colecciones, recomendaciones y auditoría antes de declarar MVP listo o comenzar Social/IA.

Para SSMS: (localdb)\OndaDev, autenticación Windows, base Onda. Ver docs/SQL_SERVER.md.
