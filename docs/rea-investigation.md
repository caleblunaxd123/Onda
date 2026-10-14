# REA: investigación verificable — 2026-10-14

## Instalación y registro

Se consultó el [repositorio oficial](https://github.com/morluto/rea), su documentación de instalación,
clientes, CLI y análisis administrado. Versión npm fijada: `rea-agents@6.5.0`; fuente consultada:
`3b79af28e80785afce9f5998d8f03289402a1847`.

El Node global 22.14 no cumple sus requisitos. Se utilizó Node 24.19 incluido con Codex, sin reemplazar
Node global. Instalación local en `.tools/rea-runtime`, con `--ignore-scripts`; no se instaló JADX,
Ghidra, Frida ni herramientas globales. ADB/JDK existentes bastan para compilar y probar nuestro Android.

El propietario autorizó registrar REA en `C:\Users\Caleb\.codex\config.toml`. Se hizo respaldo y
se verificó que todos los ajustes anteriores, incluido `node_repl`, permanecieran iguales. Solo se
habilitaron seis herramientas estáticas: inspect_managed_artifact, inspect_managed_members,
compare_managed_members, analyze_javascript_application, compare_javascript_export_shapes e
inspect_analysis_view. No se modificó Claude ni se instaló la skill opcional de REA.

El self-test del MCP local observó 207 herramientas y seis prompts, sin faltantes/duplicados. Doctor
confirmó el registro Codex alineado. `environment_healthy=false` señala motores opcionales ausentes.
**El catálogo de esta conversación aún no expone REA**; se usó su CLI real. El registro requerirá que
Codex recargue la configuración; no se afirma haber llamado REA mediante el catálogo actual.
Configuración respaldada conforme a la [documentación oficial de MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## Artefactos propios

| Pregunta | Evidencia | Resultado y límite |
|---|---|---|
| ¿Qué contiene la API compilada? | inspect_managed_artifact, evidencia `ev_4ee8890d8d7d1e0f9100195f053632dc4f84655eb5f0e86b8103980ab31d5820` | .NET moderno, CIL/AnyCPU, metadatos completos; inspección estática sin ejecutar el DLL. |
| ¿Qué operaciones declara RoomsHub? | inspect_managed_members, evidencia `ev_b7f91b3837e4b38a8704677b9010bc92caf16a451e94f4416b247aa3fd56db66` | Un tipo, 40 métodos, 128 aristas de llamadas, 217 accesos a campos; Join, Snapshot, History, ServerTime, SetPlayback, ChangeMedia, TransferHost y SetCohost presentes. |
| ¿Se comportan correctamente varios clientes? | SQL real + cinco conexiones SignalR y prueba Android | Se comprueba con ejecución e integración; los metadatos REA por sí solos no demuestran sincronización. |

DLL al capturar: `.tools/rave-dotnet/bin/Onda.Api/release/Onda.Api.dll`, 389.120 bytes,
SHA256 `a288d279e772a3144c9b8fabfdebfdbfa55fe8e4041c33ede5539b485f469070`.
Ese hash identifica el build analizado; compilaciones posteriores pueden cambiarlo.
Las salidas JSON completas se conservan en `.tools/rea-onda-api-artifact.json` y
`.tools/rea-rooms-hub-members.json`, fuera de Git. No contienen capturas de sesiones ajenas.

## Hallazgos aplicados

1. Confirmado por lectura y prueba del puente generado: los saltos YouTube en pausa no se detectaban;
   se corrigió su observación y la aplicación de revisiones, con pruebas ejecutando nuestro JavaScript.
2. Confirmado por código: el cliente podía aceptar un snapshot anterior; ahora rechaza revisiones viejas
   y permite cambios de presencia a igual revisión. Se corta el muestreo de reloj al cerrar la conexión.
3. Confirmado por integración: dos controles con la misma versión compiten; el servidor acepta uno.
   El bloqueo de sala y la recarga dentro de Join protegen cambios simultáneos de cierre/anfitrión.

Rave se tomó como referencia de comportamiento visible en las capturas del propietario. No se obtuvo
ni descompiló su APK y no se infiere que use una arquitectura concreta. No se copiaron código o recursos
propietarios ni se intentó evitar DRM, autenticación o restricciones de proveedores.

Siguiente investigación útil: HLS propio con expo-video, medición de drift en cinco reproductores reales
y WebRTC con TURN dimensionado. Requieren evidencia distinta del análisis estático del Hub.
