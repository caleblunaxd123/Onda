# Preparación de Google Play — 2026-10-28

**Decisión: apta como beta de radios para probar con usuarios; no declarar lista para producción en Play Store.**
Esta revisión publica web/API/APK en infraestructura del propietario. No crea claves de distribución,
cuenta de desarrollador, ficha ni lanzamiento en Google Play.

## Comprobado

- Aplicación radio-only 0.7.2/code13, sin registro, salas, chat, video ni IA.
- Backend 107/107 con SQL real, móvil 47/47, TypeScript/ESLint y CI correctos.
- Web/API/APK públicos comprobados, catálogo real de220 países, favoritos locales conservados.
- Target Android 16/API 36, consistente con el requisito vigente desde 31/08/2026 para nuevas apps/updates.
- Comprobación previa 0.7.0: APK con empaquetado ZIP de 16 KB y44 bibliotecas nativas de 64 bits cuyos segmentos LOAD tienen alineación de 16 KB.
  Esto no sustituye ejecución en un entorno de 16 KB ni la inspección del AAB final en Play Console.
- Sin permisos de GPS o micrófono; audio de emisoras directo, sin grabación/retransmisión de ONDA.

## Pendientes antes de publicar

1. **AAB y firma de distribución.** El APK actual usa la firma de depuración de la beta anterior.
   Definir clave de subida respaldada y Play App Signing, generar y comprobar el AAB final.
   La firma de Google Play será distinta de la beta externa: planificar la transición conservando
   la biblioteca y ofrecer exportación/importación si fuera necesario; no prometer actualización directa
   entre certificados distintos ni recomendar borrar datos sin copia.
2. **Pruebas físicas.** Al menos varios teléfonos/Android y redes: cambio Wi-Fi/datos, cortes/reconexión,
   pantalla bloqueada, segundo plano largo, llamadas, auriculares/Bluetooth, batería, texto grande y TalkBack.
   Verificar especialmente cambiar/pausar emisoras y que nunca queden dos audios simultáneos.
   En la candidata beta se encontraron permisos heredados de almacenamiento externo (hasta API32),
   superposición (`SYSTEM_ALERT_WINDOW`) y biometría. No se usan en el flujo de radios; retirarlos
   de la variante de distribución y volver a inspeccionar su manifest antes del AAB final.
3. **Privacidad y datos.** Política pública accesible desde app/ficha y Data safety que refleje el tráfico real
   hacia API, emisoras, logos y proveedor de mapa. Favoritos/historial locales no equivalen a ausencia total
   de tráfico/datos. Revisar los reportes de problemas y logs del servidor. No hay SDK de anuncios ni cobros.
   Datos históricos de la edición social se conservan sin exponer; definir su retención por separado.
4. **Ficha y contenido.** Nombre/responsable/contacto, descripción fiel, capturas, icono, gráfico promocional,
   clasificación y público objetivo. Verificar atribuciones del mapa/catálogo y uso de contenido/marcas de terceros.
5. **Dependencias y operación.** Resolver o evaluar los avisos restantes del tooling Expo, completar monitoreo,
   respaldo externo automático y procedimiento de atención a emisoras/reportes. El backup/restauración actual pasó.
6. **Cuenta de Play Console.** Si es personal creada después del 13/11/2023, la regla publicada exige
   al menos 12 testers inscritos continuamente 14 días en prueba cerrada, antes de solicitar acceso a producción.
   Confirmar el requisito concreto en la cuenta del propietario; no se inspeccionó ni registró esa cuenta.

La prueba interna/cerrada es el siguiente paso recomendado cuando el AAB/firma y la información de
la app estén preparados. No hacen falta más funciones sociales para validar este MVP de radios.

## Fuentes oficiales consultadas

- [Firma y Play App Signing](https://developer.android.com/studio/publish/app-signing).
- [Requisitos de API objetivo](https://support.google.com/googleplay/android-developer/answer/11926878).
- [Compatibilidad de páginas de 16 KB](https://developer.android.com/guide/practices/page-sizes).
- [Política de datos de usuario](https://support.google.com/googleplay/android-developer/answer/10144311).
- [Preparar contenido para revisión](https://support.google.com/googleplay/android-developer/answer/9859455).
- [Pruebas para cuentas personales nuevas](https://support.google.com/googleplay/android-developer/answer/14151465).
