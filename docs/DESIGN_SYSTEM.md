# Sistema de diseño
Tema oscuro: fondo #0B1326, superficie #172644, marca #29D3CF, acento #8769F6,
en vivo #FF667C, texto #F5F8FF, secundario #A8BAD1.
Tema claro: fondo #F7FAFF, superficie blanca, texto #14213C, marca #159FAD, violeta #7254D8.
Texto secundario claro oscurecido para legibilidad. Sistema/oscuro/claro persistidos.

Escala de espacios: 4, 8, 12, 16, 24, 32, 48.
Radios: 12/24/99. Controles con área mínima aproximada de 48 px.
Tipografía del sistema con escalado accesible. Etiquetas en controles y estados de carga.
Logos de origen con fallback de icono; no se incluyen fotos sin licencia.
Componentes iniciales en src/ui.tsx: Label, Page, Heading, Card, Button, Artwork,
StationRow, Favorite, Loading, Message, MiniPlayer. Reproductor completo como pantalla.
Validación visual en Android, contraste automatizado y lectores de pantalla: pendiente.

## Referencia del propietario
Ver design-reference.png. Inicio usa tarjeta editorial, saludo, búsqueda y carruseles;
ocho estados de ánimo en dos filas; navegación inferior compacta con miniplayer encima.
Radar usa profundidad por tarjetas superpuestas; reproductor centra logo circular y control principal;
mapa mantiene panel inferior de esquinas redondeadas; búsqueda incluye países y géneros seleccionables.
Los datos y estados corresponden a la app, sin simular cuentas, oyentes ni canciones de la referencia.
