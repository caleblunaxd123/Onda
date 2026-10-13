# Despliegue verificado — beta 0.3, 2026-10-13

- Web: https://onda.lunalav.pe
- API: https://onda-api.lunalav.pe (`/health/live`, `/health/ready`).
- Android: https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.3.0
- APK: 118.045.320 bytes, SHA256 `d4490436697b9d712ea6ff124a8ee9ceb99dae7ddbaa003903dcc0fe9f5edcc9`.
  arm64-v8a, armeabi-v7a y x86_64. JavaScript incluido, HTTPS, firma de depuración para beta interna.

## Contabo y Cloudflare
VPS 217.216.82.43, despliegue `/opt/onda`, acceso SSH del propietario con usuario `deploy`.
Los registros A `onda` y `onda-api` están proxied en Cloudflare. Caddy existente termina HTTPS y solo acepta
peers de Cloudflare para estos hosts; sobrescribe las cabeceras de IP antes de enviar al backend.
ASP.NET confía únicamente en el proxy configurado 10.77.0.10. SQL no tiene puerto publicado.
No se modificaron rutas ni datos de otras aplicaciones del VPS.

`infra/contabo/compose.yaml`: API, migrador y Ollama; redes existentes `stack_data` (interna) y `stack_web`,
más red privada `onda_ai`. Imagen activa API `onda-api:20261013-cinema2`.
Ollama fijado a digest `sha256:292ee7945dfc3d5840a181f3ab86fedb1e66703e02c8af98b50f4da56b7e278c`;
modelo `qwen2.5:1.5b` descargado. Límite API 768 MB/1,5 CPU; Ollama 2 GB/2 CPU.
IA verificada con `engine=local-ai`, filtros reales y 8 estaciones; respaldo por reglas en indisponibilidad.

SQL Server 2025 Express compartido, base dedicada `Onda`. Runtime `onda_runtime` con permisos de datos
en su esquema; migrador `onda_migration` db_owner solo de Onda. Conexiones en archivos secretos montados,
nunca en Git, variables publicadas, imagen ni cliente. Migraciones explícitas con imagen desplegada:

```sh
cd /opt/onda
sudo docker compose --env-file compose.env run --rm migrate
sudo docker compose --env-file compose.env up -d api
```

## Actualizar
1. Revisar cambios y SQL de migración; ejecutar pruebas antes de publicar.
2. Crear respaldo con `sudo python3 /opt/onda/backup.py --restore-check` antes de migraciones.
3. Construir una imagen con etiqueta nueva: `docker build -f backend/Dockerfile -t onda-api:<release> backend`.
4. Cambiar `ONDA_IMAGE` en `/opt/onda/compose.env`, migrar, reiniciar solo ONDA y verificar ready/HTTPS/WebSockets.
5. Exportar web con `npm --prefix apps/mobile run export:web`, public API env HTTPS, copiar `dist` a `/opt/onda/public`.
   Conservar bundles anteriores para visitantes con HTML antiguo. Los nombres de bundles llevan hash.
6. Generar APK con `scripts/build-apk.ps1 -ApiUrl https://onda-api.lunalav.pe`; publicar en `public/downloads`.
   Usar un nuevo parámetro de versión/enlace para evitar una copia previa del APK en CDN (TTL 4 h observado).
7. No hacer `compose down` en el stack compartido, ni eliminar volúmenes, DB o datos ajenos.
8. Para cambios de proxy usar `install-proxy.py` con la ruta revisada: valida, conserva backup y recarga Caddy;
   mantiene el inode del archivo compartido montado. Rechaza rutas duplicadas.

## Respaldo
Timer diario `onda-backup.timer` 03:40 UTC, persistente, retraso aleatorio ≤10 min. Backup SQL COPY_ONLY CHECKSUM,
VERIFYONLY, cifrado AES-256-CBC/PBKDF2 200.000, SHA256; retención 14 días conservando los dos más recientes.
Archivos: `/opt/stack/backups/sql/onda`; clave privada `/opt/onda/secrets/backup.key`.
`--restore-check` descifra/restaura en `OndaBackupCheck`, valida catálogo y elimina su propia DB de comprobación.
Última restauración verificada: `Onda-20261013T232735Z.bak.enc`, ya con esquema de comunidad y continuidad.
Copia externa manual comprobada en `.tools/backups` del PC del propietario (ignorada por Git); clave protegida
con DPAPI CurrentUser. No hay todavía copia externa automática ni alertas operativas externas.
No publicar backups, credenciales, tokens ni archivos `.env`.

## Desarrollo Windows
`.\SQLEXPRESS` por defecto; `scripts/sql-config.ps1` agrega `.tools/dotnet` al PATH si está instalado.
`scripts/init-db.ps1`, `scripts/start-api.ps1`, `scripts/test-api.ps1`. LocalDB alternativo: `(localdb)\OndaDev`.
HTTP solo en variante development; preview requiere HTTPS. Emulador API local: 10.0.2.2:5080.
Para Metro con adb reverse usar `--lan` (localhost puede enlazar solo IPv6).

## Pendiente para producción y tiendas
Firma privada, pruebas físicas, auditoría de dependencias de herramientas, correo verificado/recuperación por correo,
moderación operativa y procedimiento para atender reportes, monitoreo/alertas y backup externo automático.
No hay voz RTC, casting, PiP ni integraciones Netflix/Spotify/Disney+.
