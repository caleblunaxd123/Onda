# Propuesta original de protocolo y evolución

Se conserva el servidor autoritativo y SignalR. No se envían videos a través del WebSocket: cada player
recibe su contenido por el proveedor autorizado. WebRTC se justifica para voz en vivo, no para VOD.

Envelope propuesto para eventos tipados: `roomId`, `eventId`, `sessionId` opaco público distinto del token,
`revision`, `serverTime`, `kind`, `payload`. Jamás enviar huellas/tokens internos como sessionId público.
Los siguientes nombres son diseño del contrato futuro, no eventos nuevos ya disponibles:

| Evento propuesto | Equivalente actual / siguiente paso |
|---|---|
| ROOM_CREATED | POST rooms + RoomView |
| ROOM_JOINED / ROOM_LEFT | Join/Leave, State y presencia |
| MEDIA_SELECTED | ChangeMedia / PlayQueued + State |
| MEDIA_READY | Pendiente ACK de adaptador con timeout y política de inicio |
| PLAYBACK_STARTED / PAUSED / SEEKED | SetPlayback + State; EventId de control añadido |
| PLAYBACK_SYNC | Snapshot / ServerTime / muestreo cliente |
| HOST_CHANGED | TransferHost / continuidad + State |
| PARTICIPANT_RECONNECTED | Join + historial/votos/pin y nuevo muestreo |
| ROOM_CLOSED | Closed |

El cambio de envelope completo requiere negociación de protocolo; no renombrar de golpe eventos de
clientes instalados. Primero mediciones, capacidades y ACK de medios; después contrato versionado.

Abstracciones existentes: `PlaybackAdapter`, capacidades y sync-engine. Evolución propuesta:
`MediaProvider`, `PlaybackController`, `PlaybackState`, `PlaybackCapabilities`, `MediaSession` y
`SynchronizationAdapter` como contratos claros de selección, ejecución, estado y reconciliación.
No rehacer reproductores que funcionan para cumplir nombres. HLS propio añade un adaptador expo-video.

Reloj: ancla UTC monotónica durante el proceso, versiones persistidas, cliente con offset medido.
Reinicio: nueva sesión de conexión y snapshot. A gran escala: coordinación distribuida, deduplicación
con retención acotada y pruebas de procesos múltiples antes de habilitar otra réplica.

Observabilidad propuesta sin contenido privado: percentiles RTT/drift, tiempo de entrada, reconexiones,
errores por proveedor, duración y retorno a salas. No registrar texto, correos, tokens o enlaces privados.
