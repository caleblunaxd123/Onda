# Desarrollo y despliegue
## LocalDB
Ejecutar scripts/init-localdb.ps1, luego scripts/start-api.ps1.
En SSMS: (localdb)\OndaDev con autenticación Windows. Los datos quedan en la instancia local.
Para apagarla al terminar: sqllocaldb stop OndaDev. No ejecutar drop ni borrar sus archivos.

## Docker de desarrollo
Copiar .env.example a .env y establecer MSSQL_SA_PASSWORD fuerte.
docker compose up --build
SQL Server escucha solo localhost:1433; API localhost/LAN:5080.
Migrador como tarea de una sola ejecución después del healthcheck; API espera su éxito.
Compose utiliza SQL Server Developer, exclusivamente para desarrollo y pruebas.
Docker no estaba instalado/disponible al realizar esta implementación; ejecución pendiente.

## VPS Linux: preparación, no desplegado
Usar SQL Server compatible y edición apropiada; dimensionar memoria antes de elegir VPS.
Una cuenta SQL de runtime con mínimos permisos y otra de migración; no usar sa en producción.
Secretos mediante variables o gestor de secretos, nunca en Git.
API detrás de HTTPS (ejemplo Caddyfile). No publicar el puerto SQL a internet.
Configurar backup SQL nativo programado, cifrado, retención y copia externa, y ensayar restore.
Aplicar migraciones con backup previo y revisión de SQL; API no migra al arrancar.
Configurar logs con retención y sin tokens/historial privado, monitorizar /health/live y /health/ready.
Despliegue requiere aprobación del propietario.

## Android
JDK y Android SDK compatibles con Expo 57. APP_VARIANT=development habilita HTTP local.
npm run android en apps/mobile genera/compila una Development Build.
EAS profiles preparados, sin projectId ni credenciales reales. No se solicitó build de pago.
EAS preview/production requieren EXPO_PUBLIC_API_URL HTTPS y proveedor de mapas autorizado.
Tiles demo de MapLibre solo en desarrollo. Publicación en tiendas requiere aprobación.

## Pendientes de producción
Autenticación, cuentas y eliminación, sync, moderación, política de privacidad final,
auditoría de dependencias, rendimiento, build firmado, configuración de proxy y licencia SQL.
