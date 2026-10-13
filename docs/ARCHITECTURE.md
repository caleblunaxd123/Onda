# Arquitectura
## Decisiones vigentes
Monorepositorio con instalación npm propia en apps/mobile y solución .NET en backend.
Monolito modular: API → Infrastructure → Application → Domain. Tests referencia API e infraestructura.
SQL Server mediante EF Core. LocalDB en Windows; instancia SQL Server independiente o contenedor en Linux.
No PostgreSQL: cambio solicitado por el propietario durante la implementación.

## Flujo real
App → GET /api/v1/stations → adaptador Radio Browser → normalización → upsert SQL Server → DTO.
El audio fluye directamente desde el proveedor hacia el dispositivo; la API no descarga ni retransmite streams.
UUID de Radio Browser como clave estable. Tabla Stations guarda el snapshot normalizado como JSON en nvarchar(max),
con clave única e índice UpdatedAt. Es una caché persistida inicial, no el esquema relacional completo del producto.
Sin importación masiva; se sincroniza cada página solicitada. Caché HTTP de cinco minutos.

## Móvil
Cinco pestañas; búsqueda, ajustes y reproductor completo por Stack.
Una instancia global PlayerEngine; cada selección libera el handle nativo previo antes de crear otro.
Generation token descarta eventos tardíos, timeout 15 s, máximo tres reintentos con backoff 1/2/4 s.
El estado playing depende del evento nativo, no de pulsar un botón.
Favorites/history/preferences persisten en AsyncStorage con Zustand; no hay tokens emitidos todavía.
TanStack Query cancela solicitudes obsoletas y mantiene caché por filtro.
Mapa limitado a 30 resultados por consulta con clustering y coordenadas de origen; GPS deshabilitado.

## Límites conocidos
Falta normalización relacional extendida, autenticación y sincronización, búsqueda geográfica por viewport,
cache de catálogo para caída del proveedor, discovery DNS cacheado, reporting y métricas.
La implementación del temporizador depende del runtime JavaScript; comprobar suspensión en segundo plano.
No se puede garantizar 60 FPS, batería ni compatibilidad de codecs sin pruebas físicas.

## Referencias técnicas consultadas
- https://docs.expo.dev/versions/latest/sdk/audio/
- https://maplibre.org/maplibre-react-native/docs/setup/getting-started/
- https://docs.radio-browser.info/
- Versiones exactas resueltas: package-lock.json y csproj.
