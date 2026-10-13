# Decisiones
## 2026-10-12
- Repositorio inicialmente vacío; no había código que preservar.
- Expo SDK 57 estable obtenido desde npm (57.0.28), RN 0.86.3, React 19.2.3.
- Dependencias nativas elegidas con expo install; MapLibre 11.5 soporta RN >=0.80 y arquitectura nueva.
- React DOM fijado a 19.2.3 para mantener el peer de React, evitando el conflicto con 19.3.
- .NET SDK disponible 10.0.201; backend net10.0.
- SQL Server sustituye PostgreSQL por solicitud explícita del propietario.
- Instancia LocalDB exclusiva OndaDev; autenticación integrada de Windows.
- EF Core SQL Server 10.0.4; migración inicial aplicada sobre base nueva Onda.
- Catálogo solo HTTPS para esta primera versión. Puede reducir la cobertura de emisoras.
- No seguir redirects en el cliente HTTP del catálogo. Hosts de origen restringidos a *.api.radio-browser.info.
- Sin GPS ni permiso de micrófono; ONDA escucha pero no graba.
- Expo Go no es compatible con el mapa. Development Build obligatorio.
- Certificado corporativo: NODE_USE_SYSTEM_CA=1 permite usar la cadena de confianza del sistema. No se desactivó TLS.
- No exponer endpoints de usuario sin autorización: cuentas/social se implementarán antes de ofrecer sincronización.
- SQL Server Developer en Compose exclusivamente para desarrollo; edición/licencia de producción por definir.

## 2026-10-12 (continuación: catálogo, exploración y reproducción)
- Base de desarrollo: SQL Server 2025 Express `.\SQLEXPRESS` del propietario (indicado por él). LocalDB queda como alternativa.
  La base `Onda` se creó con las migraciones; no se tocaron otras bases de esa instancia. Express usa un certificado
  autofirmado: localmente `Encrypt=true;TrustServerCertificate=true`. En producción, certificado válido y `false`.
- Catálogo relacional en SQL Server con sincronización completa periódica desde Radio Browser (6 h), en vez de caché
  por página. Cursores por registros consumidos para el modo en vivo. Ver ARCHITECTURE.md.
- Etiquetas e idiomas con intercalación binaria: la intercalación por defecto (CI) consideraba iguales etiquetas que
  C# distingue («islam» y «islam🕋», «straße» y «strasse») y bloqueaba la sincronización.
- Variantes solo con criterios exactos verificables (homepage+país+nombre base, o stream idéntico); sin coincidencia difusa.
- «Caída» exige 3 chequeos fallidos consecutivos y distintos; los reportes de usuarios no cambian el estado.
- Clustering del mapa en el servidor (rejilla SQL) para mostrar recuentos reales, no los de una página cargada.
- País de escucha detectado por la zona horaria del dispositivo (tzdb `zone.tab`, dominio público) sin GPS; el locale
  es solo respaldo. Si la persona elige país en Ajustes, deja de cambiar automáticamente.
- Mapa de desarrollo con OpenFreeMap (OSM, sin clave) y etiquetas `name:es`; revisar proveedor y condiciones antes de publicar.
- Rediseño según docs/design-reference.png sin dependencias nativas nuevas (degradados con `experimental_backgroundImage`).
- Ondas y ecualizador del reproductor: decorativos, ligados al estado real del reproductor, desactivados con «reducir movimiento».
- Override npm `xcode > uuid ^11.1.1` (API CommonJS `v4()` compatible, verificado). Sin `audit fix --force`.
