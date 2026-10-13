# ONDA
**El mundo suena aquí.**

Aplicación móvil de radios con Expo / React Native y API ASP.NET Core 10.
Base de datos: **SQL Server**, por decisión del propietario (12/10/2026).
Estado: primera implementación funcional en desarrollo; **MVP todavía no aceptado**.

## Ver la app en web
Android/iOS siguen siendo los destinos nativos; la web permite revisar pantallas sin emulador.
Iniciar la API y ejecutar `npm --prefix apps/mobile run web -- --localhost`.
Abrir http://localhost:8081. Usa el mismo catálogo, biblioteca y reproductor global.
El mapa web usa MapLibre GL JS; Android conserva MapLibre React Native.
Los codecs y la reproducción en segundo plano del navegador no sustituyen las pruebas Android.

## Inicio en Windows
Requisitos: Node 24, .NET SDK 10, SQL Server LocalDB, JDK y Android SDK para compilar Android.
No usar Expo Go: MapLibre requiere Development Build.

1. `npm --prefix apps/mobile ci`
2. `powershell -ExecutionPolicy Bypass -File scripts/init-localdb.ps1`
3. `powershell -ExecutionPolicy Bypass -File scripts/start-api.ps1`
4. Copiar `apps/mobile/.env.example` a `apps/mobile/.env`.
5. En `apps/mobile`: establecer `$env:APP_VARIANT='development'` y ejecutar `npm run android`.
6. En siguientes sesiones: `npm run mobile`.

En emulador Android, la API está en `http://10.0.2.2:5080`.
En dispositivo físico usar la IP LAN del PC, permitir únicamente la conexión de desarrollo en el firewall, y compartir red.
El tráfico HTTP se habilita únicamente en builds con APP_VARIANT=development.
Preview/producción requieren una API HTTPS.

## SQL Server / SSMS
- Servidor: `(localdb)\OndaDev`
- Autenticación: Windows
- Base: `Onda`

La instancia es exclusiva de este proyecto. No se modificaron instancias preexistentes.
Las migraciones se ejecutan explícitamente, nunca automáticamente al iniciar la API.
Para otro SQL Server configurar `ConnectionStrings__Onda` y ejecutar:
`dotnet ef database update --project backend/Onda.Infrastructure --startup-project backend/Onda.Api`.

## Estructura
- apps/mobile: Expo Router, Zustand, TanStack Query, Expo Audio, MapLibre.
- backend: API, Application, Domain, Infrastructure, Tests.
- scripts: inicio local.
- docs: decisiones, estado, pruebas y despliegue.
- compose.yaml: entorno de desarrollo SQL Server + API (requiere Docker).

## Verificación
`npm run check:mobile`
`npm run test:api`
`curl http://localhost:5080/health/ready`
`curl "http://localhost:5080/api/v1/stations?country=PE&limit=10"`

OpenAPI: `/openapi/v1.json` en entorno Development.
Biblioteca local con favoritos, historial y colecciones. Usa el botón + de una emisora para organizarla.
No hay cuentas, sincronización de biblioteca, salas ni IA activadas todavía.
Consultar [estado](docs/PROGRESS.md), [pruebas](docs/TESTING.md) y [roadmap](docs/ROADMAP.md).
