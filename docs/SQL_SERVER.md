# SQL Server

Abrir SSMS, servidor `(localdb)\OndaDev`, autenticación Windows, base `Onda`.
Instancia creada exclusivamente para ONDA; motor LocalDB detectado 17.0.1000.7.

Consulta del catálogo:

```sql
USE Onda;
SELECT Id,
       JSON_VALUE(Payload, '$.Name') AS StationName,
       JSON_VALUE(Payload, '$.CountryCode') AS CountryCode,
       JSON_VALUE(Payload, '$.Codec') AS Codec,
       JSON_VALUE(Payload, '$.StreamUrl') AS StreamUrl,
       UpdatedAt
FROM dbo.Stations
ORDER BY UpdatedAt DESC;

SELECT * FROM dbo.__EFMigrationsHistory;
```

La tabla es una caché inicial de snapshots normalizados. El modelo de usuarios,
favoritos sincronizados, colecciones y entidades sociales aún no está implementado.
Favoritos e historial del modo invitado permanecen en el móvil.
UTC en UpdatedAt; PK por UUID externo; upsert con HOLDLOCK para evitar carreras.

Cambiar instancia requiere solo ConnectionStrings__Onda y aplicar las migraciones EF.
No reutilizar la autenticación sa del Compose de desarrollo en producción.
