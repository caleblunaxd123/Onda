# Progreso — 2026-10-12

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
