# ONDA Experience — identidad actual 0.6

Referencias actuales: docs/design-references. Logo oficial conservado, azul noche #080E29,
texto blanco/#B8C5E9, cyan, azul y violeta; superficies translúcidas. Gradiente de acción
#087FAD → #245CDD → #783BFF con texto blanco. Claro y azul gris siguen disponibles.
AmbientBackground, GlassSurface, GradientButton, CategoryTile, MotionCard, Skeleton y ReactionOverlay
centralizan la composición sin blur/bucles continuos ni recursos nuevos pesados.
Tarjetas de salas horizontales compactas: portada112dp, padding6, radios20, datos reales.
Navegación vertical; CTA reserva espacio, no superpone texto. Preferencia de movimiento reducido respetada.
El estado detallado está en UI_UX_REDESIGN_PROGRESS; las secciones siguientes son la referencia inicial histórica.

# Sistema de diseño
Basado en la referencia del propietario (docs/design-reference.png). Tema claro como presentación principal,
oscuro equivalente y automático (sistema) por defecto.

## Logo y color (src/theme.ts)
Logo oficial (assets/brand/onda-logo.png, marca en onda-mark.png): degradado cian #12D3E6 → azul #1478E0 →
violeta #6D3BEF. La paleta se deriva de él, como en el modelo del propietario.
| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| bg | #F5F8FC | #0A1226 | Fondo de pantalla |
| surface | #FFFFFF | #142240 | Tarjetas, barra inferior, campos |
| surfaceAlt | #EAF1F8 | #1B2B4C | Botón secundario, esqueletos |
| text / muted | #0F1A35 / #55657E | #F4F8FF / #A6B8D0 | Texto principal y secundario |
| primary | #0C98C8 | #22CBE8 | Rellenos e iconos activos |
| primaryText | #0A6E96 | #5EDDF2 | Texto de acento (≥4,5:1 sobre surface) |
| accent / accentSoft | #6D3BEF / #EEE9FE | #A78BFA / #2A2453 | «Más filtros», violeta de marca |
| live | #E5384F | #FF5C74 | EN VIVO, errores |
| brand | degradado del logo | igual | Botón reproducir |
| featured | #0B1B4D → #1D3FA6 → #6B2FC9 | similar | Destacada, Radar, reproductor |
| headerGlow | celeste suave → fondo | azul noche → fondo | Cabecera de marca |
Clusters del mapa: cian #1FBFD8 (<10), azul #2F74E6 (<60), violeta #6D3BEF (<300), magenta #B13CD6.

Los degradados usan `experimental_backgroundImage` (RN 0.86, nueva arquitectura) con color de respaldo;
las sombras, `boxShadow`. Icono, icono adaptativo y splash (expo-splash-screen) generados desde el logo.

## Tipografía y espaciado
Fuente del sistema, escalado accesible limitado a 1,6×. Títulos de pantalla 26/32 (800), secciones 18/24 (800),
cuerpo 15/21, secundario 13/18. Espacios 4, 8, 12, 16, 20, 24. Radios 12/16/20/24/99. Objetivos táctiles ≥44 px.

## Componentes (src/ui.tsx)
BrandHeader (logo, onda de marca animada solo con reproducción real, título con emoji y acciones) en las pestañas ·
ScreenHeader (título, subtítulo, atrás, acciones) · Chip (filtro seleccionable/eliminable) · StationRow
(logo, nombre, bandera + región + género, estado real, favorito, menú ⋮) · StationActions · Sheet (hoja inferior) ·
OptionPicker (lista filtrable con recuentos reales) · SearchField · PlayButton · LiveBadge · StationStatus ·
MiniPlayer flotante · StationTile · Loading (esqueletos) · Message · EmptyState · ListFooter · CollectionPicker.

## Reglas de contenido
- EN VIVO solo cuando el reproductor nativo informa reproducción; «Conectando…» y «Cargando audio…» son distintos.
- Sin oyentes, canciones, cuentas, avatares ni métricas simuladas de la referencia.
- Recuentos solo cuando son reales (total de la consulta o del área visible), nunca el tamaño de una página.
- Saludo según la hora local del dispositivo: 05–11 «Buenos días», 12–18 «Buenas tardes», resto «Buenas noches».
- Logos de origen con respaldo de iniciales coloreadas; banderas emoji del sistema.
- Mapa de desarrollo: OpenFreeMap (liberty/dark, datos OSM con atribución). Revisar condiciones antes de publicar.

Validación pendiente: TalkBack completo, texto grande extremo, contraste automatizado y tabletas.
