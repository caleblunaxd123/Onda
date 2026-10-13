# Continuación para Claude Code — ONDA 0.3

## Prompt listo para usar

```text
Continúa ONDA desde https://github.com/caleblunaxd123/Onda, rama codex/onda-modules-contabo.
El objetivo es una app multimedia social más intuitiva, fácil y completa, inspirada en las sesiones
compartidas de Rave, conservando la identidad de ONDA y su catálogo de radios.
No prometas superioridad sin pruebas con usuarios ni inventes fallos de la competencia.

Primero ejecuta git fetch y revisa estado/diff antes de integrar cambios. Conserva cambios locales,
biblioteca, cuentas, catálogo y otras aplicaciones del servidor. Lee AGENTS.md aplicables,
README.md y docs/{PROGRESS,ARCHITECTURE,ROADMAP,TESTING,DEPLOYMENT,DEPENDENCIES,SQL_SERVER}.md.
Verifica la implementación: no vuelvas a crear módulos que ya funcionan ni uses datos sociales falsos.

Web https://onda.lunalav.pe; API https://onda-api.lunalav.pe; APK beta público en
https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.3.0&build=2. Contabo, Cloudflare, Caddy, SQL Server Express,
Ollama local. .NET 10, Expo SDK 57, React Native 0.86.3. SQL Server es decisión del propietario;
no lo sustituyas por PostgreSQL.

Prioridad inmediata: cerrar validación en Android físico y dos dispositivos en redes diferentes;
reproducción audible, sincronía multimedia, reconexión, batería, 30 min bloqueado,
Bluetooth/llamadas, TalkBack/texto grande y estados de error claros.
Recuperación de sala y coanfitriones ya están implementados. Continúa con
voz opcional WebRTC con controles simples y música atenuada, colecciones compartidas y
sesiones programadas. Avanza por incrementos funcionales verificables según ROADMAP.
No presentes Netflix, Disney+ o Spotify como soportados sin integración oficial funcional.
No descargues/bypassees contenido protegido. YouTube mantiene su reproductor oficial y video.

Mejora el recorrido: elegir contenido -> crear sala -> invitar -> entrar -> proponer/votar
-> escuchar/ver -> guardar -> volver. Evita formularios innecesarios, controles ambiguos,
audio duplicado y acciones del anfitrión que un invitado pueda ejecutar. Privacidad predeterminada.

Ejecuta npm run check:mobile y scripts/test-api.ps1; referencia 56 móvil y 95 backend
(SQL real, cuentas y dos clientes SignalR). Usa scripts/sql-config.ps1 para SDK .NET local.
SDK 57 usa hooks de navegación de expo-router, no @react-navigation/native.
Instala paquetes nativos con Expo; no edites android/ios generados a mano.
No uses npm audit fix --force: quedan 19 high en herramientas sin parche compatible;
el adaptador MIT decode-uri-component 0.5.0 mantiene CommonJS y tiene pruebas de regresión.

Para desplegar, lee DEPLOYMENT.md. Usa credenciales existentes sin imprimirlas ni versionarlas.
Respalda y prueba restore antes de migrar, usa el migrador con secreto separado y runtime mínimo.
No migres al arrancar, no publiques SQL/Ollama ni reinicies el stack ajeno.
Presencia/chat/votos son de una sola instancia: no agregues réplicas sin coordinar estado.
No subas .env, claves SSH, backups, tokens o códigos de recuperación a GitHub.

Entregable por incremento: código terminado, pruebas apropiadas, evidencia Android/web,
documentación vigente, commit y resumen de comportamiento y límites reales.
No marques el MVP aceptado solo porque compila. No solicites nuevamente permiso para cambios,
pruebas, push y despliegue ya autorizados; pregunta solo por información imprescindible.
```

## Estado que debe conservarse
- Catálogo: 68.031 almacenadas, 38.815 variantes principales reproducibles HTTPS, 242 países (snapshot 13/10).
- Biblioteca preservada: radios, historial confirmado por audio, colecciones y multimedia.
- Cuenta opcional, upgrade de invitado con misma identidad, revocación y recuperación por código privado.
- Sincronización con versiones y merge; historial optativo; medios guardados sin descargar archivos.
- Salas públicas/privadas, chat/reacciones, cola/votos, permisos, transferencia, bans, reportes e invitaciones renovables.
- YouTube/YouTube Music, archivos HTTPS y radio. Posición/pausa compartidas, clock offset y resync.
- Asistente Qwen2.5 1.5B local, filtros de catálogo y fallback visible; pasaporte basado en escuchas, sin GPS.
- Web/Android usan la API pública; APK con clave de depuración para beta, pendiente firma privada para tiendas.

## Pendientes operativos
No hay SMTP/correo verificado, voz RTC, PiP/casting, premium providers,
moderación operativa con panel/admin ni alertas externas. Backup diario cifrado y restore probados;
copia externa manual en PC, pendiente automatizar fuera del VPS. Pruebas físicas/auditoría pendientes.
Los videos pueden rechazar embeds. Radio no promete sincronía exacta por muestra.
La sesión web está en sessionStorage por pestaña; no es una sesión permanente entre navegadores.

## Incremento 0.3: salas y diseño
Sala cinematográfica oscura, modo cine, web en dos columnas y móvil compacto, seek con teclado/gestos,
chat con seguimiento de mensajes, portadas de contenido real, buscador de salas, invitación copiable,
pegado de enlaces y contenido guardado. Hasta dos coanfitriones con permisos de reproducción/cola;
moderación solo del anfitrión. Continuidad optativa: 60 s de gracia, prioridad a coanfitrión conectado;
reconectar antes conserva al anfitrión. Salas anteriores mantienen continuidad desactivada.
Cola con prioridad fijada y votos personales recuperados al reconectar. Sincronización con anclas de tiempo
para evitar saltos al silenciar/cambiar roles. 95 pruebas backend y 56 móvil.
El propietario indicó continuar primero con salas/diseño; todavía no tiene proveedor de correo transaccional.
