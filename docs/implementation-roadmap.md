# Prioridades ejecutables

| Prioridad | Trabajo | Estado / siguiente evidencia | Coste |
|---|---|---|---|
| P0 | YouTube play/pausa/seek y estados claros | Corrección de seek pausado y revisión del puente implementadas; QA Android final | Sin nuevo servicio |
| P0 | Google Android | OAuth creado y acceso real confirmado; Testing, web/iOS pendientes | Sin API pagada |
| P1 | Versiones/reconexión/conflictos | Cinco conexiones SQL/SignalR comprobadas; medición con teléfonos pendiente | Servidor actual |
| P1 | HLS nativo propio | Añadir expo-video compatible, validación de URLs y adapter; probar sin DRM | Desarrollo, sin almacenar videos |
| P1 | Voz en vivo | WebRTC, mute, permisos, TURN y cuotas; no grabar; requiere aprobación de infraestructura | Egreso/red, dimensionar primero |
| P2 | Bloqueos/denuncias/revisión | Implementados y probados; migración y operación humana pendientes de publicación | SQL limitado |
| P2 | Cola y control colaborativo | Cola, votos y prioridad del anfitrión existentes; pedir control por implementar | Bajo |
| P3 | Inicio/sala compactos | Implementado; verificar tamaños/teclado/accesibilidad en teléfonos | Bajo |
| P4 | Amigos, salas favoritas, eventos | Diseñar privacidad y límites; priorizar retención real | Bajo/moderado |
| P5 | Escala/observabilidad | Medir concurrencia, drift, RAM y reconexiones; evaluar backplane solo si hace falta | Según usuarios |

Tres problemas principales investigados: saltos YouTube en pausa; snapshots viejos/reconexión/conflictos;
seguridad social sin bloqueo persistente ni revisión operativa. Los dos primeros recibieron mejoras de
código y pruebas. El tercero tiene candidata funcional pero exige desplegar, configurar responsables y operar.

## Lanzamiento económico

1. Gratis: conseguir usuarios, medir salas usadas, fallos, tiempo hasta entrar y retorno; corregir fricción.
   No invertir en IA pagada ni guardar fotos/archivos/videos del chat.
2. Validar Plus: propuesta y beneficios reales, interés de usuarios y compras sandbox. RevenueCat es una
   alternativa a evaluar, no una integración activa. No activar suscripción sin valor probado y autorización.
3. Crecer: Creator, comunidades, eventos patrocinados y publicidad moderada cuando exista audiencia.
   Denuncia, bloqueo y seguridad siguen gratuitos.

Cada etapa entrega código, pruebas, evidencia y estado honesto. No ofrece catálogos DRM sin autorización.
Antes de despliegues, cambios destructivos, instalaciones globales, infraestructura o cargos se pide la
aprobación indicada en el documento maestro del propietario. Ver [condiciones de lanzamiento](LAUNCH_READINESS.md).
