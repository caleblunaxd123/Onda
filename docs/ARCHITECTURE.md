# Arquitectura
## Decisiones vigentes
Monorepositorio con instalación npm propia en apps/mobile y solución .NET en backend.
Monolito modular: API → Infrastructure → Application → Domain. Tests referencia API e infraestructura.
SQL Server mediante EF Core. Desarrollo en Windows: SQL Server Express `.\SQLEXPRESS` (instancia del propietario);
LocalDB `(localdb)\OndaDev` sigue disponible como alternativa. Linux/CI: contenedor SQL Server 2022.
No PostgreSQL: cambio solicitado por el propietario durante la implementación.

## Catálogo
Fuente: Radio Browser (https://docs.radio-browser.info/). Servidores descubiertos por DNS
(`all.api.radio-browser.info`), solo hosts `*.api.radio-browser.info`, User-Agent descriptivo,
máximo 3 solicitudes simultáneas por proceso, timeout 8 s (búsqueda) / 45 s (listado), failover a 3 hosts.

### Persistencia (migración RelationalCatalog)
- `Stations`: columnas normalizadas (nombre, nombre plegado sin acentos, país ISO, región/ciudad, idioma bruto,
  stream principal y alternativo HTTPS, homepage, logo HTTPS, códec, bitrate, votos, clics, coordenadas,
  clave de variante, estado de disponibilidad, actividad y marcas de tiempo).
- `StationTags` y `StationLanguages`: géneros e idiomas normalizados, intercalación binaria
  (`Latin1_General_100_BIN2`) para que la unicidad en SQL coincida con la comparación ordinal de C#.
- `SyncRuns`: progreso reanudable (offset de registros consumidos de la fuente, latido, error).
- `StationReports`: reportes de usuarios.
- La migración convierte el JSON `Payload` de InitialSqlServerCatalog a columnas y etiquetas antes de eliminarlo,
  y su `Down` reconstruye el JSON. Prueba: `MigrationPreservesTheLegacyJsonCatalog`.
- Índices: país+clics, clics, `IX_Stations_Geo` (lat, lon filtrado a geolocalizadas, con columnas incluidas),
  nombre plegado, país+región, clave de variante, SampleKey, LastSeenAt; Tag y Code.
  Consultas por rectángulo con B-tree lat/lon (sin tipo geography: no requiere NetTopologySuite).

### Normalización
- Nombres: sin caracteres de control ni símbolos decorativos iniciales («# », «-- »); nunca se fusionan por nombre.
- Países: código ISO validado, nombre en español generado con ICU (`Application/Data/labels.json`).
- Idiomas: `languagecodes` o nombre inglés → código ISO; etiqueta en español.
- Géneros: plegado, sin emojis/símbolos, alias (hiphop → hip hop, 80's → 80s) y glosario en español.
- Coordenadas fuera de rango o (0,0) se descartan; no se inventan.
- Streams: solo HTTPS para reproducir. Si `url_resolved` es HTTP pero `url` oficial es HTTPS, se usa la HTTPS.
  Emisoras solo-HTTP se guardan (para variantes y estado) pero no se listan.

### Variantes y fuentes alternativas (criterios verificables)
1. Mismo país + misma homepage normalizada + mismo nombre base (sin marcadores de calidad «128k», «AAC», «HD»).
2. Sin homepage: URL de stream idéntica.
Una elección SQL (`ROW_NUMBER`) marca la emisora principal de cada grupo (activa, HTTPS, mejor disponibilidad,
más popular). Las listas muestran solo principales; el DTO incluye `streams[]` con las alternativas HTTPS del grupo.

### Disponibilidad
Se usa el chequeo de Radio Browser (`lastcheckok`, `lastchecktime`). Un fallo solo cuenta si es un chequeo nuevo
(otra marca de tiempo). `unstable` con 1–2 fallos consecutivos (sigue listada, baja en el ranking);
`down` con 3 o más (oculta). Un chequeo correcto vuelve a `ok`. Los reportes de usuarios no cambian el estado.

### Sincronización
`CatalogSyncService` (BackgroundService): al arrancar y cada 6 h recorre `/json/stations` ordenado por
`changetimestamp`, páginas de 1.000, pausa de 500 ms, máx. 200 páginas por ciclo. Cada página se confirma junto
con el offset → reanudable tras reinicio. `sp_getapplock` garantiza un único sincronizador. Si un lote falla se
guarda fila por fila. Al completar: retira (IsActive=0, sin borrar) las emisoras no vistas si la pasada fue
plausible (≥50 % del catálogo activo) y recalcula variantes. Configuración: sección `Catalog` (Mode, SyncEnabled,
SyncIntervalHours, SyncPageSize, SyncPageDelayMs, SyncMaxPagesPerRun, SyncStartupDelaySeconds).

### Consultas y paginación
- Modo `auto`: catálogo SQL cuando existe una sincronización completa; antes, Radio Browser en vivo.
- Catálogo SQL: filtros en SQL, orden estable (disponibilidad, clics, votos, id), página = offset exacto,
  `total` real en la primera página (COUNT con los mismos filtros).
- En vivo: `FilteredPaginator` pide lotes a la fuente y filtra (HTTPS, etiqueta exacta, excluidos);
  el cursor avanza por **registros consumidos**, no por resultados supervivientes; una página filtrada vacía con
  `hasMore=true` no es el final (solo una página corta de la fuente lo es). Presupuesto: 4 solicitudes, 10 s.
  Las páginas en vivo se guardan en SQL; si la fuente falla, se sirve SQL con `stale=true`.
- Cursor opaco versionado (`v1:catalog|live:offset`, base64url). `offset` heredado sigue aceptado.
- `order=discover`: grupo de candidatos acotado (populares, coincidencias de géneros/países del perfil y una
  muestra sembrada de la cola larga vía `SampleKey`), ordenado por `Recommendations.Score` + jitter determinista
  por semilla y diversificado (sin repetir país/género consecutivos). Caché 10 min; máx. 600 por semilla.
- Mapa: `GET /api/v1/map?bbox&zoom` agrega en SQL celdas de ~48 px (`FLOOR(lat/celda)`, `FLOOR(lon/celda)`)
  con recuento exacto y total del área; celdas de 1 incluyen el id. Soporta antimeridiano.
- Facetas desde los datos: países (con límites por percentiles 3–97 %), ciudades/regiones por país, idiomas
  (≥3 emisoras) y géneros (≥10). Caché 30 min.

### Endpoints
`GET /api/v1/stations` (q, country, tag, language, region, bbox, geo, order, seed, boostTags, boostCountries,
exclude, cursor, limit) · `GET /api/v1/stations/lookup?ids=` · `GET /api/v1/map` · `GET /api/v1/facets/{countries|
languages|tags|places}` · `GET /api/v1/catalog/status` · `POST /api/v1/stations/{id}/reports` · `GET /api/v1/moods`.
Límites: 240 solicitudes/min por IP; reportes 10 cada 10 min por IP. CORS solo para la vista web local (GET/POST).

## Móvil
Expo SDK 57, Expo Router, TanStack Query, Zustand, Expo Audio, MapLibre (RN en Android, GL JS en web).
- `src/api.ts`: timeout propio + cancelación de TanStack Query, mensajes de error en español.
- `src/catalog.ts`: `useStationFeed` (useInfiniteQuery) acumula sin duplicados manteniendo el orden, sigue
  hasta 3 páginas filtradas vacías, se detiene a 600 emisoras en memoria y pide afinar filtros.
- `src/discovery.ts`: perfil local (favoritos ×3, colecciones ×2, historial con decaimiento), semilla diaria.
- `src/world.tsx` + `src/geo.ts`: viewport con debounce de 400 ms, clave redondeada, celdas → GeoJSON,
  panel compartido Android/web, selección sincronizada mapa↔lista, países, ciudades, «Sin ubicación».
- `src/player-engine.ts`: una instancia global; cada selección libera el handle anterior; contador de generación
  descarta eventos tardíos; fuentes HTTPS ordenadas (principal + alternativas), 2 intentos por fuente
  (4 si solo hay una), máximo 6 en total, timeout 15 s, backoff 1/2/4 s; «Conectando…» hasta el evento nativo
  `playing`. Temporizador comprobado también en cada evento nativo y al volver a primer plano.
- `src/player.ts`: lockscreen con `isLiveStream`, `clearLockScreenControls` al liberar.
- `src/library.ts`: biblioteca local; `refreshStations` actualiza instantáneas por id sin quitar ni reordenar.
  El layout raíz la refresca una vez al día con `/stations/lookup`.

## Límites conocidos
Sin cuentas ni sincronización de biblioteca; sin salas ni IA. Búsqueda por subcadena (LocalDB/Express sin
Full-Text). Temporizador dependiente del runtime JS. Variantes solo por criterios exactos (no difusos).
Sin pruebas físicas de audio, Bluetooth, llamadas, batería o background prolongado.

## Referencias técnicas consultadas
- https://docs.expo.dev/versions/v57.0.0/sdk/audio/
- https://maplibre.org/maplibre-react-native/docs/setup/getting-started/ (tipos 11.5 instalados)
- https://docs.radio-browser.info/
- https://openfreemap.org (estilos de mapa de desarrollo)
