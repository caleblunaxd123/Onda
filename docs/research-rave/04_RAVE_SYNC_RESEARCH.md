# Sincronización: hallazgos frente a implementación propia

REA inspeccionó `com.wemesh.android.rearch.fragments.rave.videoplayer.helpers.PlayerSynchronizer`:
31 métodos y 22 campos. Evidencia `ev_00bdc9c1fc3831de643193a75931b4fff5eebe7afbb094476d33e161f95c115e`.
`applyBaseSpeed` declara un parámetro Media3 ExoPlayer. Otros miembros describen posición, instante,
velocidad, umbrales, ajustes pequeños y tareas de corrección. Los nombres no prueban el comportamiento.

Se inspeccionó únicamente `calculateDesiredPosition(long)`, sobrecarga 0, DEX `(J)J`.
Evidencia `ev_585b22886b0e6f7c9ca2176200f4ad0bfb870bd4036f9a1c371f00434d18bfae`:
representación Java disponible, sin fallback ni marcadores de decompilación incompleta.
El método proyecta una posición desde una referencia temporal y velocidad, sin retroceder bajo la
referencia inicial. **Evidencia estática**, no validación en ejecución ni descubrimiento del servidor Rave.
No se publica ni reutiliza el cuerpo decompilado.

## Algoritmo original ONDA

Ya existía antes de obtener el APK:

```text
esperada = max(0, posiciónBase + (reproduciendo ? max(0, ahoraServidor - instanteBase) / 1000 : 0))
offset = instanteServidor - puntoMedio(instanteEnvioCliente, instanteRecepcionCliente)
```

Se elige la muestra de menor RTT de cinco mediciones. RTT/2 limita incertidumbre de reloj bajo
supuestos de muestreo; no mide la distancia audiovisual entre dos reproductores.
Configuración ONDA: tolerancia 0,5 s, seek por encima de 3 s, corrección progresiva máxima ±5 % en
adaptadores que soportan velocidad. Son parámetros nuestros pendientes de ajustar con teléfonos.

## Refuerzo implementado en candidata 0.6.2

- `MonotonicUtcClock`: ancla UTC y tiempo transcurrido monotónico; un ajuste del reloj del sistema no
  salta la reproducción dentro del proceso. Reinicios vuelven a anclar UTC y exigen snapshot/muestreo.
- `PlaybackCommand.EventId` opcional mantiene compatibilidad con 0.6.1. Último ID, huella de sesión y
  huella de comando se persisten. Reintento idéntico de la misma sesión devuelve estado sin reaplicar.
- Un ID repetido con otro payload se rechaza; otra sesión necesita una versión vigente. La deduplicación
  conserva el último control: reintentos más antiguos son rechazados por versión, no una cola infinita.
- Estado SQL autoritativo, versión, autorización y locks por sala siguen siendo la protección principal.
- Reconnect vuelve a Join/snapshot/historial/votos/pin y vuelve a medir el reloj.
- Traspaso manual/automático evita asignar una segunda sala abierta a un propietario.

Pruebas: cambios de reloj hacia adelante/atrás; cinco relojes simulados desajustados; pérdida/rejoin;
doble control concurrente; reintento idéntico y manipulado; permisos de coanfitrión; recuperación con gracia.
Cinco clientes SignalR son prueba de protocolo, **no cinco reproductores audiovisuales reales**.
Pendiente: medir drift real en dos redes, buffering/asimetría y cambios bruscos del reloj cliente.
