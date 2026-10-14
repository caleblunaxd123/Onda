# Sincronización: autoridad, revisiones y límites

El servidor publica `{media, positionSeconds, updatedAt, isPlaying, version}`. Las operaciones de control
requieren ser anfitrión/coanfitrión y enviar la versión conocida; el bloqueo por sala serializa cambios.
Dos controles simultáneos basados en la misma versión no se aplican ambos. Join obtiene estado fresco
después de adquirir el bloqueo y rechaza salas cerradas o acceso revocado.

El cliente estima desfase usando cinco muestras NTP y la de menor RTT. Repite el muestreo cada 60 segundos;
al desconectar corta ese intervalo. Reconecta con esperas 0/2/5/10 segundos y pide snapshot actualizado.
`acceptsRoomState` rechaza versiones viejas, IDs ajenos y versiones inválidas; admite igual versión para
actualizaciones de presencia que no cambian la reproducción.

Posición esperada: ancla + tiempo transcurrido del servidor cuando está reproduciendo. HTML5 absorbe
drift pequeño con hasta ±5 % de velocidad; drift grande provoca seek. YouTube usa seek solo por encima
de tres segundos porque no se aplica ajuste fino de velocidad. Estos umbrales son configuración inicial,
no una garantía de precisión en todas las redes.

## Corrección 0.6.1

La revisión viaja también al iframe/WebView. Un controlador conserva su acción local mientras llega la
confirmación; una proyección repetida de la misma revisión no vuelve a una posición anterior. Comandos
con revisión menor se rechazan. Un cambio de reproducción por desconexión se aplica incluso si la versión
no cambió. Las correcciones remotas no generan controles de vuelta al servidor.

El puente observa cambios cada 500 ms y reporta progreso cada dos segundos. Detecta saltos tanto en pausa
como en reproducción y evita duplicar el mismo control mientras espera respuesta. Un invitado que intenta
saltar vuelve al ancla de la sala. Se preservan eventos oficiales de play/pause, finalización y errores.
Al entrar pausado se usa cueVideoById con startSeconds: muestra miniatura oficial sin iniciar el video.
Al saltar estando pausado no se vuelve a enviar pausa después del seek, pues su buffering podía cancelarse.
Referencia: [operaciones oficiales de YouTube](https://developers.google.com/youtube/iframe_api_reference).

## Evidencia

- Prueba con SQL y cinco conexiones SignalR: late join en reproducción avanzada, dos controles concurrentes,
  autorización de roles, snapshot concordante y reconexión durante pausa.
- Pruebas del JavaScript generado: seek pausado, proyección repetida, deduplicación, corrección sin eco,
  rechazo de revisión vieja, invitado, pausa/reanudación y pausa por desconexión.
- QA nativa descrita en [informe de pruebas](testing-report.md).

Cinco conexiones de protocolo no son cinco decodificadores reproduciendo frames. Faltan mediciones de drift
entre teléfonos físicos, cambios Wi-Fi/datos, buffering largo, ahorro de batería y segundo plano por proveedor.
La radio live no promete precisión de video VOD. Un servicio externo solo ofrece un reloj manual.
