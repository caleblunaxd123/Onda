# Producción y revisión local — 2026-10-14

## Candidata 0.6.1: pendiente de aprobación

Web exportada y APK local `dist/ONDA-0.6.1-contabo.apk`, versionCode 9, tres ABI, 124.503.330 bytes,
SHA256 `1b2f302b2bc17bab50ec32a8379836f4ec73eebcfcc275081c69d788475afec5`.
Firma beta conserva SHA1 de OAuth; no hay RECORD_AUDIO. Nueva API/migración SafetyBlocks pendiente de
publicar; no publicar la APK candidata contra la API anterior porque los bloques no están disponibles.
Respaldo cifrado/restauración antes de migrar y rollback preparados como requisitos del release.
No se han activado cobros ni nuevas infraestructuras. Ver [preparación](LAUNCH_READINESS.md).
QA nativa: pausa/±10 segundos y fotogramas oficiales confirmados. La principal quedó 0.6.1 con datos
preservados: Android rechazó downgrade a 0.6.0; no se desinstaló ni limpió. API antigua aún causa aviso de
bloqueos en chat. Cuenta/sala QA propias eliminadas. No se publica esta combinación como release.

Google se activó con aprobación en la API vigente: `GOOGLE_WEB_CLIENT_ID` público en compose.env,
`Google__WebClientId` interpolado en Compose. Solo se recreó API con su misma imagen y se comprobó ready.
OAuth `onda-511605` en Testing; Android comprobado con cuenta real autorizada. No se guardó client secret.

## Versión pública conservada

- Web: https://onda.lunalav.pe
- API: https://onda-api.lunalav.pe (`/health/live`, `/health/ready`).
- Android: https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.5.0&build=7.1
- APK 0.5.0 (versionCode 7): 124.465.418 bytes, SHA256
  `f5d64d673f77bb7986d80937f2f7d027bec5010ee177938ff2144929984c06e1`.
  Hash local/remoto iguales y HEAD público verificado (200, tamaño y tipo APK). Nuevo enlace build=7.1.
  arm64-v8a, armeabi-v7a y x86_64; JS incluido, HTTPS, firma de depuración para beta interna.
  APK 0.4 anterior conservado en `/opt/onda/releases/ONDA-beta-0.4.0-build5.apk`.

## Revisión 0.6
API y web inicial 0.6 actualizadas antes de la petición nueva de aprobar producción. La última corrección
compacta de tarjetas y orientación vertical está en el repositorio/APK local y no se publicó después.
La ampliación de emojis no necesitó migración de SQL. Smoke público pasó 32/32.
APK local `dist/ONDA-0.6.0-contabo.apk`, versionCode8; 124.482.718 bytes, SHA256 `812541ec40ef7ad0544e14df02a1ef00a5461912a959c673455c5e1362882e78`.
Instalado con -r y cuenta/biblioteca conservadas. Orientación portrait y permiso RECORD_AUDIO ausente en APK.
No publicar esta revisión ni productos/cargos sin autorización. APK público sigue siendo 0.5.0 build7.1.

## Contabo y Cloudflare
VPS 217.216.82.43, despliegue `/opt/onda`, acceso SSH del propietario con usuario `deploy`.
Los registros A `onda` y `onda-api` están proxied en Cloudflare. Caddy existente termina HTTPS y solo acepta
peers de Cloudflare para estos hosts; sobrescribe las cabeceras de IP antes de enviar al backend.
ASP.NET confía únicamente en el proxy configurado 10.77.0.10. SQL no tiene puerto publicado.
No se modificaron rutas ni datos de otras aplicaciones del VPS.

`infra/contabo/compose.yaml`: API, migrador y Ollama; redes existentes `stack_data` (interna) y `stack_web`,
más red privada `onda_ai`. Imagen activa API `onda-api:20261014-ui-experience` (chat persistente, pins y Google preparado; subidas deshabilitadas). Adjuntos privados en `/opt/onda/uploads` → `/data/chat-uploads` (UID 1654, 0700), fuera de `public`.
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
4. `GoogleIdentity` añade una columna nullable e índice único, sin borrar cuentas/sesiones. Cambiar `ONDA_IMAGE` en `/opt/onda/compose.env`, migrar, reiniciar solo ONDA y verificar ready/HTTPS/WebSockets.
5. Exportar web con `npm --prefix apps/mobile run export:web`, public API env HTTPS, copiar `dist` a `/opt/onda/public`.
   Conservar bundles anteriores para visitantes con HTML antiguo. Los nombres de bundles llevan hash.
6. Generar APK con `scripts/build-apk.ps1 -ApiUrl https://onda-api.lunalav.pe`; publicar en `public/downloads`.
   Publicar primero con archivo temporal + reemplazo atómico. Usar un nuevo parámetro de versión/enlace para evitar una copia previa del APK en CDN (TTL 4 h observado).
7. No hacer `compose down` en el stack compartido, ni eliminar volúmenes, DB o datos ajenos.
8. Para cambios de proxy usar `install-proxy.py` con la ruta revisada: valida, conserva backup y recarga Caddy;
   mantiene el inode del archivo compartido montado. Rechaza rutas duplicadas.

## Respaldo
Timer diario `onda-backup.timer` 03:40 UTC, persistente, retraso aleatorio ≤10 min. Backup SQL COPY_ONLY CHECKSUM,
VERIFYONLY, cifrado AES-256-CBC/PBKDF2 200.000, SHA256; retención 14 días conservando los dos más recientes.
Archivos: `/opt/stack/backups/sql/onda`; clave privada `/opt/onda/secrets/backup.key`.
Desde 0.4 también `OndaUploads-<fecha>.tar.enc` (adjuntos, misma clave y retención); `--restore-check` lo descifra
y lista. Respaldo previo verificado: `Onda-20261014T042314Z.bak.enc` y `OndaUploads-20261014T042314Z.tar.enc`.
`--restore-check` descifra/restaura en `OndaBackupCheck`, valida catálogo y elimina su propia DB de comprobación.
Restauración previa a GoogleIdentity verificada: `Onda-20261014T042314Z.bak.enc`.
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

Incremento de navegación: APK build=3 instalado sin borrar datos, explorador YouTube Android probado
con búsqueda/selección reales y otra conexión pública recibiendo cambio de video y cola. El emulador
volvió a su sala anterior con la pausa/posición conservadas. QA sintético propio eliminado.
Web exportada; búsqueda YouTube web externa hasta configurar Data API (decisión del propietario).

## Chat y Google en beta 0.5
`Chat__AllowedKinds: ""` impide nuevas subidas incluso en clientes anteriores. Los stickers son identificadores
de recursos incluidos; no se almacenan imágenes. Mantener el volumen privado para adjuntos históricos y su retención.
Google no tiene IDs configurados; `/api/v1/auth/providers` devuelve enabled=false y no se emiten challenges.
Activación y huellas públicas: GOOGLE_SIGN_IN.md. HTML SPA se sirve con no-store; bundles con hash se conservan.
SDK 57: `expo prebuild` recrea por defecto; usar `--no-clean` para regenerar cambios manteniendo carpetas/caché.
No editar archivos nativos generados. API local 5080 y build dev anteriores permanecen activos; para usar el esquema
nuevo en desarrollo hay que migrar/reconstruir local explícitamente antes de reemplazar su API.
