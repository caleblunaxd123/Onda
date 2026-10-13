# Progreso — 2026-10-12

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
