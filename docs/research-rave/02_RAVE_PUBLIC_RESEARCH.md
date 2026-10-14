# Rave: comportamiento documentado y referencia de UX

Fecha de consulta: 2026-10-14. La [FAQ oficial](https://rave.io/faq) describe salas para ver contenido
juntos con texto y voz, invitaciones y diversas fuentes. Los servicios de suscripción requieren cuentas
de sus participantes. Drive/Photos son fuentes externas; Rave Premium elimina publicidad.
Estas afirmaciones no documentan su protocolo interno ni prueban acuerdos de integración.

La captura posterior del propietario muestra el formulario MyDisney al elegir Disney+ dentro de Rave.
Es evidencia de acceso presentado dentro de ese flujo, coherente con WebViewGridFragment observado
en el APK. No muestra reproducción, licencias o sincronización; no demuestra por sí sola un iframe,
un motor nativo ni un acuerdo de integración. No se recopilaron credenciales Disney.

Las capturas proporcionadas por Caleb muestran una jerarquía comprensible: lista de salas, acción de
crear, selección de fuente, búsqueda dentro de esa fuente y una sala con reproductor/chat. Son evidencia
visual de esas pantallas, no prueba de todos los proveedores o de su sincronización en otras redes.

ONDA adopta una organización propia: entrar o crear desde el inicio; elegir fuente y entrar antes de
buscar contenido; retomar la sala abierta; tarjetas horizontales compactas con presencia real.
Se eliminan las grandes categorías repetidas del pie del inicio. No se copian logos ni recursos de Rave.

## Sitio público analizado con REA MCP

Se inventariaron URLs observables en https://rave.io/es y se capturaron once scripts de primera parte,
11.265 bytes. No se capturaron cookies, sesiones ni scripts de terceros. Evidencias:

- Aplicación: `ev_29e8080252ca0914657abd8f046cd30bbb6cca42ceec88af966357128a1416aa`.
- Resumen: `ev_11ee60ef358cd89a6e9bdf3ec5ea325312a25e9d8dc5dd44096ead385ddac522`.
- Hash de artefacto: `3436e0ba98594d738fb5dc8817c9b2a7d00f9d0a4b858ef3160e27e731d30381`.
- Once archivos analizados, 2.904 nodos AST, 42 hallazgos, cero errores de parseo; 612 incógnitas semánticas.

Los nombres de módulos señalan un sitio Astro de marketing, con diseño, idioma y consentimiento.
La cobertura estructural es completa dentro de esa captura; la interpretación semántica es parcial.
**Esto no describe la arquitectura de la app Android.** Los scripts originales permanecen fuera de Git.
