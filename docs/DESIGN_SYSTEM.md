# Sistema de diseño
Basado en la referencia del propietario (docs/design-reference.png). Tema claro como presentación principal,
oscuro equivalente y automático (sistema) por defecto.

## Color (src/theme.ts)
| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| bg | #F5F7FB | #0B1326 | Fondo de pantalla |
| surface | #FFFFFF | #152241 | Tarjetas, barra inferior, campos |
| surfaceAlt | #EDF2F8 | #1C2B4D | Botón secundario, esqueletos |
| text / muted | #101A33 / #56667F | #F5F8FF / #A8BAD1 | Texto principal y secundario |
| primary | #0E9AA8 | #2DD4CF | Rellenos (botón reproducir, chips activos) |
| primaryText | #0A7A86 | #4FE0DB | Texto e iconos de acento (≥4,5:1 sobre surface) |
| accent | #6F52E3 | #9B87FF | Violeta: radar, luna |
| live | #E5384F | #FF5C74 | EN VIVO, errores |
| featured | degradado 120° #101B44 → #2C2A78 → #7A2F7E | similar | Destacada, Radar, reproductor |

Los degradados usan `experimental_backgroundImage` (RN 0.86, nueva arquitectura) con color de respaldo;
las sombras, `boxShadow`. Sin dependencias nativas nuevas.

## Tipografía y espaciado
Fuente del sistema, escalado accesible limitado a 1,6×. Títulos de pantalla 26/32 (800), secciones 18/24 (800),
cuerpo 15/21, secundario 13/18. Espacios 4, 8, 12, 16, 20, 24. Radios 12/16/20/24/99. Objetivos táctiles ≥44 px.

## Componentes (src/ui.tsx)
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
