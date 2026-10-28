# ONDA radios: Contabo y Cloudflare

Revisión 2026-10-28. La base de esta entrega es `main` en `a97f976`; la preparación
de producción está en `codex/radio-only-release`, commit de aplicación `180c737`.
El propietario autorizó analizar y desplegar web y APK con el alcance exclusivo de radios.

## Alcance

Inicio mundial, búsqueda, Mundo, Radar, reproductor, favoritos y colecciones locales.
No se publican cuentas, salas, chat, video ni IA. Las antiguas tablas sociales, secretos
y adjuntos se conservan para recuperación; la API nueva no los expone ni monta sus archivos.
No ejecutar migraciones Down, borrar tablas ni restaurar un backup sobre la base viva.
El esquema del catálogo no cambia y esta entrega no requiere aplicar migraciones.

## Entorno

- Web: https://onda.lunalav.pe
- API: https://onda-api.lunalav.pe
- APK: https://onda.lunalav.pe/downloads/ONDA-beta.apk?v=0.7.0&build=11.1
- Directorio del VPS: `/opt/onda`; imagen `onda-api:20261028-070-radio`.
- Compose revisado: `infra/contabo/compose.yaml`. Solo servicio API; redes existentes
  `stack_data` y `stack_web`. No publica SQL ni un puerto nuevo del host.
- Credencial SQL runtime montada desde `secrets/runtime.connection`, fuera de Git/env/imagen.
- Caddy y DNS proxied de Cloudflare existentes: conservar las rutas y aplicaciones ajenas.
  El proxy permitido por ASP.NET es `10.77.0.10`; no aceptar forwarded headers de cualquiera.
- HTML `no-store, max-age=0`; conservar bundles con hash de versiones anteriores.
  APK por sustitución atómica y parámetro de versión nuevo para evitar la copia vieja en CDN.

La configuración nueva usa solo `compose.yaml`. No añadir el antiguo overlay de correo:
esta edición no envía correo ni necesita Google OAuth, Resend, Ollama o el volumen de chat.
Detener únicamente `onda-ollama` al terminar; conservar su volumen. Otros contenedores no se reinician.

## Procedimiento

1. Validar backend con SQL real y cliente (tipos, lint y pruebas).
2. Respaldar mediante `sudo python3 /opt/onda/backup.py --restore-check`.
   El respaldo de esta entrega se verificó el 2026-10-28, incluyendo catálogo restaurado en una
   base separada y archivo cifrado de adjuntos: `Onda-20261028T201845Z.bak.enc` y
   `OndaUploads-20261028T201845Z.tar.enc`. No versionar claves ni respaldos.
3. Construir imagen desde el backend exacto revisado. Probar primero un contenedor temporal,
   sin puerto público, sincronización desactivada y acceso con la cuenta SQL runtime existente.
4. Exportar web con `EXPO_NO_DOTENV=1`, `EXPO_PUBLIC_API_URL=https://onda-api.lunalav.pe`
   y `APP_VARIANT=preview`; `npm --prefix apps/mobile run export:web -- --clear`.
5. Generar APK con `scripts/build-apk.ps1 -ApiUrl https://onda-api.lunalav.pe`.
   Verificar versión, package `app.onda.radio`, firma compatible, tres ABI, HTTPS embebido,
   ausencia de permiso de micrófono/GPS y hash antes de publicarlo.
6. Guardar copias privadas del Compose, env, index y APK anteriores. Cambiar `ONDA_IMAGE`
   y ejecutar solo `docker compose --env-file compose.env -f compose.yaml up -d --no-deps api`.
   No ejecutar `down`, `--remove-orphans` ni migraciones de una instantánea antigua.
7. Comprobar ready, consultas reales, CORS y 404 en las rutas retiradas. Publicar assets primero
   y reemplazar index/APK atómicamente. Confirmar HTML y hash del APK a través de Cloudflare.
8. Verificar web y actualización Android `install -r`, conservando biblioteca. No borrar datos.

## Rollback

Restaurar únicamente Compose/env/index/APK de `/opt/onda/releases/radio-070-before-*`.
La API anterior necesita `-f compose.yaml -f compose.email.yaml`; el overlay anterior se conserva.
Restaurar su imagen y, si se detuvo para esta entrega, iniciar `onda-ollama`.
No revertir SQL. Los artefactos anteriores y datos existentes permanecen disponibles.

## Validación y límites

69 pruebas backend con SQL real (cero omitidas), 38 móviles, TypeScript/ESLint y export web.
Contenedor candidato contra SQL de Contabo: 36.757 emisoras HTTPS, 220 países, rutas sociales 404.
CI del código: [push](https://github.com/caleblunaxd123/Onda/actions/runs/40763026922) y
[PR](https://github.com/caleblunaxd123/Onda/actions/runs/40763302063) correctos.

PKCS fijado a 9.0.22; node-forge 1.4.2; decodificador de query-string 0.5.1.
La auditoría npm conserva nueve avisos (seis bajos y tres altos), en dependencias del tooling
Expo (deepmerge/Zod y su cadena). No se forzaron cambios incompatibles de SDK/Zod para ocultarlos.
Revisarlos al actualizar SDK; no se expone un servidor Metro en producción.

El APK usa la firma de depuración de la beta existente. No equivale a publicación en tiendas.
El manifest todavía incluye permisos heredados de superposición, almacenamiento externo antiguo
y biometría que deben retirarse de la variante de tienda; el flujo de radios no los solicita.
Pruebas físicas, batería/segundo plano largo y disponibilidad de cada stream siguen siendo límites
de validación. Las emisoras transmiten directamente al dispositivo; ONDA no retransmite ni graba.

## Resultado de publicación

Publicada y comprobada el 2026-10-28. API live/ready 200; 69.768 emisoras registradas y
36.757 HTTPS en 220 países. Smoke real de catálogo, búsqueda, paginación, mapa y facetas correcto.
Index y tres assets públicos idénticos al export; Cloudflare DYNAMIC y HTML no-store.
Rutas sociales 404 y enlaces antiguos de sala redirigidos al inicio. CORS verificado.

APK 0.7.0/code11: 117.248.287 bytes; SHA256
`ca4f6c0117131418921195c937638e95592168cce89ec9522fb8b9a8b56c52e8`.
Descarga pública completa comparada con el archivo local. Misma firma beta anterior, tres ABI,
HTTPS y sin micrófono/GPS. Instalación Android conservó el favorito previo y los datos locales.
Web: mapa real y reproducción observada. Capturas en `docs/screenshots/*070*`.

Compose/env/index/APK previos conservados en VPS. `onda-ollama` detenido sin borrar su volumen;
los otros servicios conservaron sus tiempos de actividad. No se aplicaron migraciones ni se borraron cuentas.
No se publicaron cambios en tiendas ni se activaron cobros. Ver [pendientes de Play Store](PLAY_STORE_READINESS.md).
