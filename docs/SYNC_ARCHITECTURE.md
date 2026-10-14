# Estado y evolución de sincronización

Fuente canónica: ListeningRoom en SQL; comandos SignalR autorizados por membresía y rol,
semaphore por sala, Version de concurrencia y timestamp del servidor. RoomView ofrece snapshot.
Cliente client.ts: generación invalida callbacks antiguos; reconnect 0/2/5/10 s, Join + History/MyVotes/Pin,
5 muestras ServerTime y nueva medición cada 60 s. estimateClock usa la menor RTT y punto medio.
sync-engine.ts proyecta posición y decide corrección según capacidades del adaptador.
No interpretar RTT/2 como medida real del desfase audiovisual entre teléfonos.

YouTube: IFrame oficial, play/pause/seek; sin ajuste fino de velocidad. HTML5 abierto: rate/seek según
reproductor. Radio: fuente compartida, buffers independientes sin seek. Servicios DRM externos: reloj manual.
Ver provider-compatibility.md; no aumentar capacidades solo cambiando un booleano en el cliente.

Siguiente bloque: medir entrada, rejoin y recuperación en dos redes; introducir operationId/idempotencia
donde falte, reconciliar comandos viejos y explicitar loading/buffering/timeout sin tapar el player oficial.
Prueba de desconexión debe durar lo suficiente para recovery de host y comprobar permisos antes/después.
No insertar múltiples players ni mezclar audio global con el de una sala. No reescribir motores por estética.
