# Roadmap y aceptación
- Fase 0: inspección y decisiones realizadas.
- Fase 1: estructura, navegación, diseño y API + SQL Server implementados. Development Build Android instalado en emulador.
- Fase 2: catálogo real persistente (sincronización completa, normalización, variantes, disponibilidad) implementado;
  audio nativo con fuentes alternativas implementado; verificación audible en dispositivo pendiente.
- Fase 3: inicio personalizado por país, búsqueda con filtros y facetas reales, biblioteca local, ánimos, radar con
  carga progresiva, mapa por viewport con clusters, países, ciudades y emisoras sin coordenadas, reportes y onboarding
  implementados y verificados en emulador/web.
  Pendiente: búsqueda de texto completo, recomendaciones editoriales, sincronización de biblioteca con cuenta.
- Fase 4: pruebas automatizadas amplias (62 backend con SQL real + 36 móvil); pendiente beta Android física,
  rendimiento, memoria, batería, accesibilidad completa (TalkBack) y background prolongado.
- Fase 5: salas SignalR NO iniciadas; dependen de la aceptación del MVP. La pestaña lo indica sin simular personas.
- Fase 6: IA NO iniciada.
- Fase 7: publicación NO iniciada (falta proveedor de mapas con licencia de producción, HTTPS, firma y auditoría).

## Revisión de pendientes de fases posteriores
- Onboarding: implementado (país detectado por zona horaria + géneros, omitible). Falta prueba con usuarios.
- Accesibilidad: roles y etiquetas en controles, objetivos ≥44 px, contraste de texto de acento ≥4,5:1, escalado de
  fuente limitado a 1,6×, animaciones desactivadas con «reducir movimiento». Falta auditoría con TalkBack.
- Rendimiento: listas virtualizadas, máx. 600 emisoras en memoria, consultas SQL indexadas, cachés de 5–30 min,
  clusters agregados en servidor. Falta perfilado en dispositivo de gama media.
- Cuentas y sincronización de biblioteca: no iniciadas. Requieren autenticación (JWT/refresh), modelo de usuario,
  borrado de cuenta y política de datos antes de exponer endpoints de usuario.

## Puertas del MVP
No aceptar el MVP por typecheck, bundle o tests unitarios.
Requiere Android físico, varios streams audibles, cambio rápido sin solapamiento,
background 30 minutos, lockscreen/Bluetooth/llamadas, persistencia tras reinicio,
errores y conectividad, mapa usable, radar, temas y auditoría de dependencias resuelta.
