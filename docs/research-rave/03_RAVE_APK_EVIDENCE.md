# APK legítima: procedencia y evidencia estática

Instalada desde Google Play en el emulador autorizado del propietario, paquete `com.wemesh.android`.
Se copiaron únicamente los APK instalados legibles por ADB. No se accedió a datos privados de la app.

Versión observada: **9.0.49**, code **2349**, min SDK **32**, target **36**.
Activity de lanzamiento: `com.wemesh.android.rearch.RaveActivity`.

| Archivo | Bytes | SHA256 |
|---|---:|---|
| base.apk | 82.271.083 | `123b43186e68e0cf54b27c499b706aa7d815a47c8a825f5ebff622563616a204` |
| split_config.x86_64.apk | 79.223.285 | `32b51e9adf1e133222f3fa1585ab943e170fcaeff313242ee5d770d20827f0a9` |
| split_config.xxhdpi.apk | 181.596 | `19074763028f3b3ce9a30ed6abf8e713133186e151c26c81bd0aefd81575da44` |

`apksigner verify --print-certs` verificó los tres APK. Comparten certificado SHA256
`2a5928b54578be0441e4bce2040663cd2eb7b1017c4327237063b676fe9cd66d`
y sello de origen Play `3257d599a49d2c961a471ca9843f59d341a405884583fc087df4237b733bbd6d`.
Esta comprobación es separada: el proveedor JADX de REA no verifica firmas/splits.

## Hallazgos y límites

| Observación | Evidencia | Interpretación / confianza / límite |
|---|---|---|
| Manifest, 55.686 clases, 3.045 recursos | `ev_01aafe0474fcdc7043863e19903757bc9feaf569a3e9abf9c4185356824126b0` | Metadatos estáticos, alta; no prueba ejecución |
| Inventario completo de clases del base | `ev_7b5d19886502e7bf2be8553c201c87ed096ce7329144621025f0f8d77085d4d6` | Completo dentro del base; nombres sintéticos/duplicados posibles |
| 76 clases Media3, 90 ExoPlayer antiguo, 172 org.webrtc, 167 okhttp3 | Prefijos del inventario | Bibliotecas empaquetadas, alta; no prueba uso o topología de servidor |
| 3.380 clases bajo com.wemesh.android; 74 Compose | Prefijos del inventario | Organización observable, sin atribuir autoría a todas las clases |
| Sin bundle JS/RN reconocible en ZIP; cero clases com.facebook.react en inventario | Inspección ZIP + inventario | No se encontró RN en estos archivos; no demostrar ausencia universal por nombre |
| Bibliotecas nativas mediasoupclient, switchboard y wemesh | ZIP de split x86_64 | Presencia, alta; no prueba llamadas activas, SFU o voz funcionando |
| WebViewGridFragment declara getWebview, canGoBack, despacho de contenido/cola | `ev_ad55c75d80b4c213a8410e1e42f9eea4c0cabfd1af6693bc35698503469df8aa` | Navegador integrado declarado, alta; no se estudió autenticación/DRM de proveedores |
| Clases de chat, typing/reply, PlayerContentHost/Kind/Presenter y RavePlayer | Inventario | Separación de responsabilidades sugerida por nombres, media; requiere ejecución para confirmar flujo |

Permisos declarados incluyen Internet, notificaciones, reproducción/micrófono en primer plano,
ubicación, cámara, medios, publicidad y compras. Declaración no equivale a autorización ni uso.
ONDA conserva sus permisos mínimos; no replica esta lista.

## Límite de ejecución

Al abrir Rave apareció su restricción explícita: no admite emuladores y requiere teléfono físico.
No se evitó ese control, no se inició sesión ni se compartió la cuenta Google con Rave.
La captura privada de diagnóstico está en `.tools/rave-emulator-unsupported.png`.
Los APK, salidas con código decompilado y recursos originales están en `.tools/`, excluidos de Git.
