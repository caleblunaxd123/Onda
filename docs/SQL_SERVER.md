# SQL Server

## Instancia de desarrollo
- Servidor: `.\SQLEXPRESS` (SQL Server 2025 Express 17.0.1000.7, instancia del propietario), autenticación Windows.
- Base: `Onda` (creada por `scripts/init-db.ps1`).
- Alternativa: `$env:ONDA_SQL_SERVER='(localdb)\OndaDev'` antes de los scripts, o `scripts/init-localdb.ps1`.
- Otra instancia: definir `ConnectionStrings__Onda` completo.

Los scripts leen `scripts/sql-config.ps1`. Las migraciones se aplican explícitamente, nunca al iniciar la API:
`powershell -ExecutionPolicy Bypass -File scripts/init-db.ps1`.

## Tablas
- `Stations`: catálogo normalizado (ver ARCHITECTURE.md).
- `StationTags`, `StationLanguages`: géneros e idiomas (intercalación binaria).
- `SyncRuns`: ejecuciones de sincronización (estado, offset consumido, latido, error).
- `StationReports`: reportes de usuarios (tipo, comentario, URL de stream, versión, plataforma, estado `open`).

## Consultas útiles (SSMS)
```sql
USE Onda;
SELECT TOP 20 Name, CountryCode, Region, Availability, ClickCount, StreamUrl FROM Stations
WHERE IsActive = 1 AND HasHttpsStream = 1 ORDER BY ClickCount DESC;

SELECT Id, Status, NextOffset, Processed, Upserted, StartedAt, CompletedAt, LastError FROM SyncRuns ORDER BY Id DESC;

SELECT Availability, COUNT(*) FROM Stations GROUP BY Availability;

SELECT r.CreatedAt, s.Name, r.Kind, r.Message, r.Platform FROM StationReports r
JOIN Stations s ON s.Id = r.StationId ORDER BY r.CreatedAt DESC;

SELECT * FROM __EFMigrationsHistory;
```

## Pruebas de integración
`scripts/test-api.ps1` ejecuta todas las pruebas backend; las de SQL crean y eliminan su propia base
`OndaTest_<id>` en `ONDA_TEST_SQL` (por defecto la instancia configurada). En CI se usa un contenedor SQL Server.

No reutilizar la contraseña `sa` de Compose/CI en producción. La API no necesita permisos de creación de bases.
