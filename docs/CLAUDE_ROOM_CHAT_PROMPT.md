# Prompt completo para Claude Code — salas, diseño y chat de ONDA

Copia el siguiente prompt en Claude Code abierto en el repositorio.

```text
Continúa ONDA en C:\Proyectos\Onda, repositorio https://github.com/caleblunaxd123/Onda,
rama codex/onda-modules-contabo. No trabajes suponiendo que main contiene el último avance.
Ejecuta git fetch, revisa git status y diff y conserva cualquier trabajo local.
Lee apps/mobile/AGENTS.md, README y docs/PROGRESS, ARCHITECTURE, ROADMAP, TESTING,
DEPLOYMENT, DEPENDENCIES, SQL_SERVER y este documento antes de editar.

OBJETIVO Y DECISIONES CONFIRMADAS POR EL PROPIETARIO
ONDA es una app multimedia social de radio, música y video. Rave, Netflix y HBO son
referencias de experiencia y presentación; mantén la identidad y el logo de ONDA.
El usuario quiere una experiencia intuitiva, elegante y consistente, sin pantallas
ni confirmaciones redundantes. Las prioridades actuales son salas, diseño y chat.
El correo transaccional queda pospuesto: no hay proveedor configurado.
No hay Google Cloud/YouTube Data API; se priorizó el navegador integrado Android.
El chat solicitado es SOLO de salas: respuestas, reacciones por mensaje, edición,
borrado, fotos, notas de voz y archivos. No ampliar a conversaciones privadas,
llamadas o videollamadas en este incremento.
La paleta elegida es azul gris medio, elegante y suave, evitando el negro intenso.

ESTADO REAL: NO CONFUNDIR BASE TERMINADA CON TRABAJO EN PROGRESO
La base social 0.3 está desplegada. Incluye catálogo SQL, biblioteca, cuentas opcionales,
recuperación por código privado, sincronización, radio/YouTube/archivos HTTPS,
salas privadas/públicas, chat básico, cola/votos, dos coanfitriones, moderación del
anfitrión, invitaciones y continuidad optativa después de 60 segundos desconectado.
La IA local funciona con Ollama/Qwen y respaldo por reglas; no inventar resultados.

El commit 15cd8da implementó y desplegó API/web para crear la sala por proveedor:
Crear sala -> elegir YouTube/Radio/Música/Video por enlace -> entrar automáticamente
en la sala -> buscar y elegir contenido dentro de ella. La sala pendiente existe
realmente, está pausada y no contiene un video o una emisora ficticia.
En Android, YouTube abre el navegador automáticamente al entrar; seleccionar el
primer video lo comparte directamente. Radio abre la selección de emisoras.
El botón YouTube de una sala abre el navegador directamente. Las propuestas de
cola conservan una acción separada. Validación: 100 pruebas backend con SQL real,
60 móvil, tipos/lint y CI verdes en ese commit. APK build=4 generado/publicado;
queda verificar este nuevo recorrido específico en el emulador.

Después se inició el diseño y el chat ampliado. ESTÁN EN PROGRESO:
- theme.ts tiene paleta soft #25344A, superficies #304159/#3A4D68, bordes #465B77,
  texto #F5F8FC y acento de ONDA. _layout.tsx elimina el tema negro forzado de salas.
  library.ts aplica una migración de apariencia una sola vez, conservando biblioteca;
  Ajustes incluye Azul gris suave, Claro, Oscuro y Automático. Validar visualmente.
- Se añadieron expo-document-picker, expo-file-system y expo-sharing con Expo SDK 57.
  expo-sharing está en plugins. Todavía no existe la UI de adjuntos/notas de voz.
  RECORD_AUDIO sigue bloqueado y el plugin de audio sigue deshabilitando grabación;
  habilitarlo mediante app.json/config al implementar notas de voz, sin tocar nativos
  generados a mano. Pedir permiso al tocar grabar, nunca al arrancar la app.
- RoomChatEntry/RoomUpload y migración 20261014004745_RoomChatStorage preparados.
- RoomChatService.cs contiene base de historial persistente, respuesta, edición,
  borrado y reacciones. RoomUploadStore.cs/RoomUploadEndpoints.cs preparan archivos
  privados y validación. REVISAR Y COMPLETAR; no están registrados ni conectados
  a los endpoints/hub. RoomsHub.SendMessage/History siguen usando el chat en memoria.
- El cliente actual todavía muestra el chat básico. No anunciar el chat ampliado
  como disponible ni desplegar estas piezas incompletas.
- La migración de chat NO se ha aplicado a Contabo y el tema soft NO está en el APK
  público build=4, que corresponde al incremento de flujo por proveedor.

1. TERMINAR Y VERIFICAR EL FLUJO DE SALAS
Mantén exactamente el recorrido confirmado: Crear sala, elegir fuente, entrar,
buscar lo que se quiere mostrar. No volver a exigir video/nombre de sala antes de
entrar ni agregar otro botón Navegar en YouTube. Nombre, privacidad y continuidad
son opciones secundarias; privada por defecto y explicación visible de los 60 s.
Al seleccionar contenido por el acceso directo, el anfitrión/coanfitrión cambia
la reproducción para todos. Un invitado propone a la cola y nunca toma control
por navegar. La cola debe seguir admitiendo propuestas sin interrumpir el video.
Cancelar el navegador vuelve a la sala; no crea salas duplicadas ni reproduce
contenido accidentalmente. Evitar duplicados por doble toque y efectos StrictMode.
No montar reproductores con URL/videoId vacío. Estado pendiente claro, controles
inactivos y guardado deshabilitado hasta seleccionar contenido válido.
Preservar creación desde radios o multimedia ya guardadas e invitaciones existentes.
En web, mantener búsqueda externa y pegado de enlaces hasta disponer de Data API;
no fingir navegador de YouTube incrustado ni resultados de búsqueda inexistentes.

2. UNIFICAR TODA LA APP
Inicio, Juntos, biblioteca, búsqueda, perfil/login, ajustes, crear sala, sala,
reproducción individual, hojas y estados vacíos deben compartir la misma paleta.
Eliminar fondos aislados de negro intenso y blancos accidentales. Respetar las
opciones Claro/Oscuro/Automático en toda la navegación si el usuario las selecciona.
Inspirarse en Netflix/HBO con portadas reales, jerarquía, espaciado, controles
claros y presentación de cine; no copiar su marca ni inventar usuarios/contenido.
Contraste legible, botones de al menos 44 dp, teclado, TalkBack y texto grande.
Mantener un solo audio activo y disposición móvil/escritorio adaptable.

3. COMPLETAR EL CHAT DE SALAS
Implementar de extremo a extremo, con permisos y datos reales:
- Responder: cita del mensaje/autor, cancelar respuesta y coherencia si se edita
  o elimina el original; sin citas con texto privado ya borrado.
- Reacciones en cada mensaje: emoji, conteo, selección propia, cambiar/quitar y
  datos de quién reaccionó. No confundirlas con reacciones generales a la sala.
- Editar mensaje propio: validación del servidor, marca editado, ventana definida
  (la base usa 15 minutos) y manejo de versiones/acciones simultáneas.
- Borrar para todos: autor; anfitrión puede moderar. Coanfitrión no adquiere por ello
  moderación. Mostrar tombstone y retirar adjuntos/reacciones del mensaje borrado.
  Borrar para mí debe ser local y no eliminar mensajes de otros del grupo.
- Fotos: selección real, previsualización, cancelación, carga/progreso/error,
  envío, visualización ampliada y acceso restringido a la sala.
- Notas de voz: permiso al usar el micrófono, iniciar/detener/cancelar, duración,
  escuchar antes de enviar, reproducción local, limpieza al salir/interrumpirse.
  Atenuar o silenciar contenido SOLO en este dispositivo; grabar/escuchar una nota
  no debe publicar una pausa o seek para todo el grupo. Evitar dos notas simultáneas.
- Archivos: selector real, nombre/tamaño/tipo, envío y guardar/compartir mediante
  acción explícita. Sin extracción/ejecución de archivos arbitrarios en el servidor.
- Indicador de escritura con caducidad; reconexión y errores sin perder el borrador.
  No simular entregas, lecturas o tildes azules; agregar recibos solo con confirmación
  real de los clientes y semántica clara.
Mantener orden de mensajes al editar/reaccionar, IDs estables, revisión por mensaje
y mezcla correcta de historial con eventos en vivo; no mover mensajes editados al final.

4. PERSISTENCIA, ARCHIVOS Y PRIVACIDAD
Conectar RoomChatService al hub/DI e historial persistente. Mantener compatibilidad
del SendMessage anterior: SignalR no admite omitir argumentos solo por valores
opcionales C#. Usar un nuevo SendChat con DTO si corresponde.
Revalidar sesión y pertenencia/roles en TODOS los comandos. Usar el bloqueo de sala
y control de concurrencia al mutar chat; no romper Room.Version/playback.
Revisar el límite SignalR 8192 frente a texto/emoji/DTO nuevos y ajustar con límites
coherentes. Paginación o límite de historial explícito; no prometer historial infinito.

Registrar MapRoomUploads y servicios. Archivos fuera del directorio web público,
en almacenamiento persistente de ONDA con permisos para UID 1654. Proteger lectura
y subida con cuenta y membresía real; impedir acceso de externos, expulsados,
sesiones revocadas, otra sala o adjuntos no enviados de otra persona.
Nunca poner tokens ONDA en URLs, iframe, logs o archivos versionados. En web, usar
fetch autorizado/blob para contenido privado; verificar soporte de headers en nativo.
No-store, nosniff, límites/tamaño/rate y MIME/signatura reales. Base: 10 MB por archivo,
100 MB diarios por usuario, 200 MB por sala; fotos JPG/PNG hasta 4096 px.
Si cambias límites/formats, documentar y probar. Audio grabado compatible Android/web.
Limpiar cargas canceladas/huérfanas, adjuntos borrados y datos de cuentas eliminadas:
AccountService/Delete y CommunityMaintenance aún necesitan adaptarse al nuevo chat.
No conservar textos/nombres/adjuntos de una cuenta eliminada en citas o reacciones.
TLS no equivale a cifrado de extremo a extremo: no afirmar que ya existe E2EE.

5. RESTRICCIONES TÉCNICAS
Expo SDK 57, React Native 0.86.3, Expo Router, .NET 10 y SQL Server Express.
NO reemplazar SQL Server por PostgreSQL/SQLite ni reescribir la app desde cero.
Leer docs versionadas SDK 57 antes de usar APIs. Instalar paquetes con expo install.
Hooks de navegación desde expo-router, no @react-navigation/native.
No editar android/ios generados; configurar permisos/plugins en app.json/app.config.ts
y regenerar al cambiar dependencias nativas. Android necesita nueva compilación.
RN 0.86: degradados mediante gradientStyle (experimental_backgroundImage nativo,
backgroundImage web). No romper el adaptador CommonJS MIT de decode-uri-component.
Quedan 19 high en herramientas sin parche compatible; no npm audit fix --force.
No descargar/circunvenir videos protegidos. YouTube conserva reproductor oficial,
video, restricciones y autenticación del proveedor; no anunciar Netflix/Spotify/etc.
como integrados si no hay integración oficial funcional.

6. VALIDACIÓN Y DESPLIEGUE
Referencia actual: 100 pruebas backend, 60 móvil. Ejecutar npm run check:mobile y
scripts/test-api.ps1; .NET local vía scripts/sql-config.ps1. Para EF usar --configuration
Release porque puede haber una API Debug local usando DLLs. La migración nueva debe
ser revisada y las nuevas funciones requieren pruebas adicionales, no solo compilar.
Probar SQL real, dos WebSockets y: permisos, persistencia/reconexión, versiones,
respuesta a mensaje borrado, reacciones, edición propia, moderación, archivos privados,
límites/MIME, revocación y limpieza. Probar flujos Android y web con evidencia visual.
En Android: crear por YouTube y Radio, selección directa, nota de voz, imagen/archivo,
teclado, cancelaciones, texto grande y conservación de biblioteca/cuenta.
El usuario puede estar usando el emulador: no competir con su input ni borrar datos.
AndroidQA es la cuenta que está usando: NO eliminarla por su nombre. Usar QA propia
identificada y limpiar solo objetos creados para esas pruebas; restaurar la vista.

Web https://onda.lunalav.pe, API https://onda-api.lunalav.pe,
APK https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.3.0&build=4.
VPS Contabo 217.216.82.43, /opt/onda, SSH deploy con clave existente
C:/Users/Caleb/.ssh/contabo_vps en este PC. No imprimir/copiar su contenido.
Imagen desplegada: onda-api:20261013-provider. Caddy compartido y Cloudflare ya
configurados; SQL/Ollama privados. Runtime/migrador tienen secretos separados.
Lee DEPLOYMENT.md antes de actuar. Antes de migrar: backup y --restore-check con
backup.py; conservar registros/datos y revisar SQL. Preparar volumen privado de
adjuntos y ampliar respaldo para esos archivos, sin exponerlos como assets públicos.
Construir imagen nueva, migrar explícitamente, actualizar solo ONDA y verificar
ready, HTTPS, chat y WebSockets. No compose down del stack compartido, no borrar
volúmenes/DB ni afectar otras apps. No migrar automáticamente al arrancar.
Exportar web conservando bundles previos. APK con JS incluido, HTTPS y ABI x86_64
para emulador además de ARM; enlace nuevo para evitar caché CDN de 4 h del APK.
La firma actual es de depuración para beta interna; no afirmar publicación en tiendas.

ENTREGABLE
Terminar este alcance antes de ampliar otros módulos: flujo simple, paleta uniforme
y chat de salas con las siete características acordadas, API/UI conectadas, pruebas,
evidencias y documentación del estado real. Push a GitHub y actualizar PR #1 sin
mezclar WIP con funcionalidades terminadas. No fusionar main por iniciativa propia.
Los cambios, pruebas, push y despliegue de ONDA ya fueron autorizados en la sesión;
preguntar solo por información imprescindible y respetar las políticas de herramientas.
Si falta una integración, indicar la parte exacta y conservar trabajo verificable.
No presentar la base en progreso como chat completo ni afirmar superioridad sobre
Rave sin pruebas con usuarios. Mantener actualizados este handoff y PROGRESS.
```
