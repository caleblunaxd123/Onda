# REA y entorno comprobado — 14 de octubre de 2026

Investigación en `codex/onda-rave-research`, Windows, sin reemplazar herramientas globales.

| Herramienta | Estado observado |
|---|---|
| Node global / npm | 22.14 / 10.9.2; Node global no satisface REA 6.5.0 |
| Node para REA | 24.19, runtime incluido con Codex |
| REA | Paquete local `rea-agents@6.5.0`; fuente `3b79af28e80785afce9f5998d8f03289402a1847` |
| MCP Codex | Seis herramientas estáticas registradas con respaldo; ahora visibles y utilizadas |
| Git | 2.48.1.windows.1 |
| Java | JDK global 17.0.19; análisis Android con JBR completo 21.0.9 de Android Studio |
| JADX headless MCP | JAR local 0.7.1, sin instalación global |
| Android | ADB autorizado, emulator-5554, API 36; build-tools 36.0.0 |
| .NET | SDK 10 local en `.tools/dotnet`; el global 9 no compila este proyecto |
| Apktool / Frida / Ghidra | No necesarios ni utilizados en este estudio |

JAR JADX SHA256: `6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75`.
Revisión fuente del motor: `5844800a486d2248fa949b74c9896285f5b54de2`.
La carga inicial con 1 GiB agotó el heap. Tras verificar RAM libre, se usaron 3072 MiB,
dos procesadores disponibles y un worker, con análisis secuencial. Los análisis terminaron correctamente.

El doctor anterior conservado en `.tools/rea-codex-doctor.json` confirma registro; los motores opcionales
ausentes no impiden estos análisis. No se ejecutó un setup global ni se modificó Claude.

Ejemplo de reproducción con el APK legítimo local, no incluido en Git:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Android/Android Studio/jbr'
$env:REA_JADX_MCP_JAR = (Resolve-Path '.tools/rea-android/jadx-headless-mcp-0.7.1-all.jar').Path
$env:REA_JADX_HEAP_MIB = '3072'
$env:REA_JADX_ACTIVE_PROCESSOR_COUNT = '2'
& 'C:/Users/Caleb/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' `
  .tools/rea-runtime/node_modules/rea-agents/scripts/rea.mjs `
  inspect-android-package .tools/rave-apk-20261014/base.apk --format json
```

MCP real: `analyze_javascript_application` sobre once scripts públicos de primera parte de rave.io;
`inspect_analysis_view` para resumen/módulos. Android se analizó con la CLI real de REA porque las seis
herramientas habilitadas en Codex no incluyen Android. No confundir ambos caminos.

Fuentes: [REA oficial](https://github.com/morluto/rea),
[JADX fijado](https://github.com/1013503897/jadx-headless-mcp/releases/tag/v0.7.1).
