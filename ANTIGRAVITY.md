# CACAO — Fermento (Beneficiadero 3D Realista)

Serious game de **postcosecha de cacao** (Charalá, Santander). El jugador explora en primera persona un beneficiadero y cacaotal realista en 3D y gestiona 5 lotes de cacao a través de fermentación → secado → prueba de corte → venta.

## Estructura del Proyecto

- **Todo vive en `fermento.html` e `index.html`**: Proyecto *single-file* (cero dependencias de servidor, cero npm, cero build scripts).
- **GitHub Pages**: Desplegable automáticamente desde la raíz (`/`) sirviendo `index.html`.
- **Dependencias externas por CDN**: Three.js **r128** y Google Fonts.

## Arquitectura de Arranque

El script tiene **dos ámbitos** y confundirlos ya ha causado dos veces la
pantalla negra:

| Ámbito | Qué vive ahí |
|---|---|
| **Global** | Pantalla de inicio: `selectChar()`, `enter()`, `startApp()` y el reintento de carga del CDN. |
| **Dentro de `boot()`** | Todo el motor: `scene`, `renderer`, `player`, `paused`, `loadLot()`, `frame()`, `updateDog()`, `blocked()`, `getGroundY()`… |

Secuencia: `DOMContentLoaded` → `startApp()` (espera a que exista `THREE`, con
reintento cada 100 ms y panel de error a los 4 s) → `boot()` construye el mundo y
arranca `frame()`. Al pulsar *Entrar*, `enter()` llama a **`window.startGame()`**,
el puente que `boot()` publica al final para exponer `loadLot()` y `paused`. Si
`enter()` se adelanta a `boot()`, deja `window.__wantStart` y `boot()` lo recoge.

**Trampas ya pisadas** (no repetir):

- Un `const` usado antes de su declaración (*temporal dead zone*) aborta `boot()`
  entero. El síntoma es lienzo negro con el HUD mostrando los valores estáticos
  del HTML (`Lote A`, `—`, `06:00`) — señal inequívoca de que `boot()` murió, **no**
  de un problema de cámara o de luces.
- `if(typeof algo==='function')` sobre una función local de `boot()` falla en
  silencio: nunca se ejecuta y el síntoma aparece lejos de la causa.
- `requestAnimationFrame(frame)` está al principio de `frame()`, así que el bucle
  sobrevive a una excepción a mitad de cuadro: el reloj del HUD puede seguir
  corriendo aunque no se renderice nada.

## Características Técnicas y Estéticas

- **Estética Clásica Realista Ultra-HD (256×256)**:
  - Texturas procedurales generadas en `<canvas>` al iniciar a resolución 256×256 (650 briznas orgánicas con flores silvestres, estarcido de fique *"CACAO SANTANDER"*, vetas profundas de madera y agregados de concreto).
  - Filtrado bilineal y mipmapping suave (`LinearFilter` / `LinearMipmapLinearFilter`) con anisotropía máxima.
  - Cero archivos de imagen externos (todo generado en memoria por PRNG con semilla determinista).
- **Relieve y Elevación 3D del Terreno**:
  - Función de elevación matemática `getGroundY(x, z)` con colinas y lomas en el cacaotal (+0.5 m a +2.5 m) y beneficiadero nivelado.
  - Normales recalculadas (`computeVertexNormals`) para sombras realistas y física de movimiento que adapta la altura del jugador al terreno.
- **Modelación y Física de Colisiones 3D**:
  - `blocked(x, z)`: detección circular para los 25 cacaoteros, cajas delimitadoras `SOLIDS` para las cuatro estaciones fijas (Cajón, Patio + Marquesina, Bodega + Báscula + Sacos, Estación Met) y límites del mapa (52×44 u).
  - `SOLIDS` es **solo para geometría estática**. Un objeto que se mueve no puede tener una caja fija ahí: se queda donde arrancó y deja un muro invisible (le pasó al perro).
- **Personaje Seleccionable y Brazos 3D (*Viewmodel 1ª Persona*)**:
  - Selección entre **Mateo** (granjero con camisa azul) y **Valentina** (granjera con camisa roja).
  - Brazos 3D ergonómicos en vista de 1ª persona con herramienta de madera y animación de inercia y balanceo natural al caminar.
- **Fauna con IA de Comportamiento Autónomo**:
  - **Perro de Finca (`updateDog`)**: Máquina de estados **vigila → ronda → acompaña**. Camina con cuatro patas y trote en diagonal, se sienta al vigilar, escanea el terreno con la cabeza y menea la cola según el estado. Respeta `blocked()` y `getGroundY()` igual que el jugador, con deslizamiento perpendicular y cambio de objetivo si se acorrala.
    - Los waypoints de `DOG_WPS` deben poder unirse **en línea recta**: la IA solo apunta a su objetivo, no hay pathfinding. Si un tramo cruza un edificio o el cacaotal, el perro se clava contra la pared.
    - La IA vive fuera de `frame()` para poder simularse sin renderizar.
  - **Bandada de Pájaros**: Vuelan en curvas armónicas con alabeo hacia el interior de la curva y aleteo según ascenso/descenso. Las alas van tumbadas en horizontal sobre pivotes en el lomo; el rumbo del grupo es `-a`, el de la velocidad tangencial del círculo.
  - **Mariposas Botánicas**: Revolotean entre árboles y realizan posados periódicos en las hojas y mazorcas.
- **Iluminación de Escena Equilibrada**:
  - **AmbientLight** (`ambLight`) combinada con **HemisphereLight**, sol y **moonLight** para eliminar caras en negro sólido en sombras e interiores.
  - `ambLight` nunca baja de `0.32×` y `hemi.groundColor` simula rebote del suelo, de modo que ninguna cara queda a `0` de luz ni de noche.
- **Ciclo de Día y Noche**:
  - `DAY_SECONDS = 420`: un día completo (24 h) dura 7 minutos reales.
  - Cada lote arranca a las **06:00 AM** (`loadLot()`), con el amanecer sobre el cacaotal.
  - `updateSky()` interpola sol, luna, hemisférica, ambiental, cielo y niebla en cada cuadro a partir de la elevación solar.
- **Sintetizador de Audio Procedural (`Web Audio API`)**:
  - Pasos en terreno, viento y lluvia ambiental continua, efectos de UI, ladridos del perro y campanada de venta (*chime*).
  - Botón de silenciar/activar en el HUD (`🔊 / 🔇`).
- **Navegación e Interfaz**:
  - **Balizas 3D Flotantes**: Cristales octaédricos giratorios con códigos de color sobre cada estación.
  - **Mini-Brújula en HUD**: Muestra orientación en grados y rumbo (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`).
  - **Atajos**: `ESC` para cerrar paneles, `Shift` para correr (multiplicador ×1.6).

## Mapa del Mundo (Centro en 0, 52×44 u)

| Estación | Tipo | Punto de Interacción |
|---|---|---|
| Cajón de fermentación | Tina de madera | (-4.5, -1.2) |
| Patio de secado | Camilla + Marquesina | (5.5, 0.3) |
| Bodega de acopio | Mostrador + Báscula | (0.5, 4.0) |
| Estación meteorológica | Garita + Anemómetro | (7.5, 4.5) |
| Árboles (Cacaotal) | Inspección de mazorcas | (-8.5, 3.5) |

## Verificación

Para validar la sintaxis de la aplicación tras editar el motor:

```bash
node -e "const fs = require('fs'); const html = fs.readFileSync('fermento.html', 'utf8'); const script = html.substring(html.indexOf('<script>')+8, html.lastIndexOf('</script>')); new Function(script);"
```

> ⚠️ **`new Function()` solo compila: no ejecuta nada.** No detecta errores de
> tiempo de ejecución. Un `ReferenceError` por *temporal dead zone* (usar un
> `const`/`let` antes de su declaración) pasa esta verificación y aun así aborta
> `boot()` entero, dejando el lienzo 3D en negro sólido con el HUD mostrando sus
> valores estáticos del HTML. **Siempre hay que abrir la página y mirar la
> consola.** Sin navegador a mano, Chrome headless sirve:

```bash
chrome --headless=new --disable-gpu --enable-unsafe-swiftshader \
  --enable-logging=stderr --virtual-time-budget=12000 \
  --screenshot=shot.png "file:///ruta/a/fermento.html" 2>&1 | grep CONSOLE
```

Para sincronizar `index.html`:
```powershell
Copy-Item fermento.html index.html
```

## Idioma

Toda la UI, comentarios del código y documentación están en **español**.
