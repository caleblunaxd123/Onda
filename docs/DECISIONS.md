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
