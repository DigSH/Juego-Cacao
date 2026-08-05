# CACAO — Fermento

Serious game de **postcosecha de cacao** (Charalá, Santander). El jugador camina en primera
persona por un beneficiadero voxel y lleva 5 lotes por fermentación → secado → venta.

## Estructura

**Todo vive en `fermento.html`** (~57 KB, un solo archivo). No hay build, ni npm, ni assets:
se abre directo en el navegador. Únicas dependencias externas: Three.js **r128** por CDN y
Google Fonts. Sin conexión, el juego muestra el overlay `#err`.

El JS es un único `<script>`: modelo y datos arriba (globales), y todo el motor dentro de
`boot()`, que solo corre si `THREE` cargó. Estilo del archivo: **muy compacto**, sentencias
en una línea, comentarios en español. Mantenlo así al editar.

## Convenciones clave

- **Cero imágenes.** Las 25 texturas son pixel-art 16×16 dibujadas en `<canvas>` al arrancar
  (`makeTex`), con `NearestFilter` para el look voxel. `makeAlphaTex` genera las que llevan
  transparencia (sol, luna, salpicaduras). PRNG con semilla fija → salen igual cada partida.
- `cube(x,y,z,tex,grupo,tinte)` usa coordenadas **de bloque**; `part(x,y,z,sx,sy,sz,…)` usa
  coordenadas de mundo y sirve para piezas sub-bloque (instrumentos).
- Los materiales se cachean por `(textura, tinte)` en `mat()`. La textura `beans` es gris a
  propósito: se **tiñe** para mostrar el estado de fermentación (morado / marrón / oliva).
- El movimiento y todas las animaciones van por **delta-time** (`SENS.move` es u/segundo).

## Mapa del mundo (bloques, centro en 0)

| Estación | Geometría | Punto de interacción |
|---|---|---|
| Cajón de fermentación | x −6..−3, z −3..−1 | (−4.5, −1.2) |
| Patio de secado + marquesina | x 4..7, z −3..0 | (5.5, 0.3) |
| Bodega + farol | x −1..2, z 4..6 | (0.5, 4.0) |
| Estación meteorológica | x 6.2..8.8, z 3.3..5.7 | (7.5, 4.5) |

Suelo: un plano de 26×22 con la textura repetida (no cubos). Cada estación tiene su entrada
en `SOLIDS` (colisión) y en `STATIONS` (proximidad, radio 3.0). **Si mueves geometría, ajusta
ambas** — `blocked()` añade 0.3 de margen.

## Simulación

- `evaluate(lot, dec)` es el corazón: calcula perfil sensorial, grado y precio. Constantes
  calibrables en `K`, `BOX_HEAT`, `DRY_K`, `DRY_EQ`, `ACID_MOD`, `VARIETIES`, `LOTS`.
- Secado: `humedad = eq + (55−eq)·e^(−k·días)`. La estación meteorológica invierte esa misma
  fórmula (`daysTo7`) para decirle al jugador cuántos días necesita con el clima de hoy —
  es la herramienta que evita que arruine los lotes lluviosos.
- Ciclo del día: 24 h en `DAY_SECONDS` (420 s). Cada lote arranca a las 6:20 = "Día N".
  `updateSky()` mueve sol y luna, ajusta luces, estrellas, farol y repinta el cielo (solo
  cuando el color cambia). `tick(dt)` avanza reloj, lluvia, nubes e instrumentos.

## Verificación

No hay extensión de Chrome conectada, así que **el render 3D no se puede ver desde aquí**.
Lo que sí se puede hacer con Node, y conviene rehacer al tocar el motor:

1. `node --check` sobre el `<script>` extraído.
2. Un harness con stubs de THREE + DOM que **ejecuta el juego completo** y simula frames:
   caza `ReferenceError`, orden de definición y regresiones de flujo. Con listeners
   capturados se puede caminar con el joystick y pulsar E de verdad.
3. Un shim de Canvas2D en software que rasteriza las texturas y el degradado del cielo a
   PNG para revisarlas a ojo.

(Vivían en el scratchpad temporal de la sesión; se borran. Recrearlos cuesta poco y vale.)

## Idioma

Toda la UI, los comentarios y los mensajes al usuario van **en español**.
