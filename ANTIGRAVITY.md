# CACAO — Fermento (Beneficiadero 3D Realista)

Serious game de **postcosecha de cacao** (Charalá, Santander). El jugador explora en primera persona un beneficiadero y cacaotal realista en 3D y gestiona 5 lotes de cacao a través de la cadena completa: **fermentación → secado → almacenamiento → predicción → prueba de corte → venta**.

## Modelo de aprendizaje

El juego es *aprendizaje basado en juegos digitales* (DGBL), no gamificación: las
mecánicas **son** el contenido. Las medallas del cierre de campaña son la única capa
de gamificación estricta.

El objeto de aprendizaje es **conocimiento procedimental**: una transformación
multietapa con variables ambientales acopladas. Cada etapa condiciona a la siguiente
y ninguna se puede optimizar por separado —el caso central es que el empaque
hermético solo conviene si el secado ya dejó el grano bajo el umbral de `WET_LIMIT`;
con grano húmedo, sella el problema en lugar de resolverlo.

El ciclo experiencial se cierra en `doProcess()` → `confirmPredict()`: antes de ver
el resultado el jugador **declara** qué grado y qué humedad espera. El contraste
predicción ↔ resultado se acumula en `predLog` y el balance final dibuja la curva
de aciertos por lote (`fCurve`), que muestra si el criterio se formó durante la
campaña o si ya venía dado.

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

## Modelo de Almacenamiento (`evaluate()`)

La tercera etapa. El grano seco **no** queda terminado: sigue intercambiando vapor
con el aire de la bodega hasta acercarse a su humedad de equilibrio.

| Constante | Qué modela |
|---|---|
| `STORE_HR` | HR *dentro* del galpón por clima (65 / 71 / 78%). Va por debajo de la HR exterior que reporta la estación: el galpón amortigua. |
| `FLOOR_HR` | +7 puntos de HR efectiva por arrumar directo al piso (humedad capilar del concreto). |
| `emcStore(hr)` | Isoterma de sorción linealizada en 60–90% HR: `0.17·hr − 4.25`. |
| `PACK_K` | Permeabilidad al vapor del empaque (fique 0.085 · polipropileno 0.055 · hermético 0.012 por día). |
| `WET_LIMIT` | 7.8% de humedad ≈ actividad de agua 0.70: el umbral donde arranca el moho. |
| `MARKET_MAX` / `MARKET_TAU` | Techo (+14%) y días característicos (22) de la prima por esperar el punto de mercado. |
| `HOLD_COST` | 38 COP por kg seco y día: bodega, capital inmovilizado y merma de manejo. |

Tres decisiones: `storeDays` (0–60), `empaque` y `estiba`. Efectos: rehumedecimiento
hacia la EMC, moho, plaga de bodega, olor absorbido del piso, pérdida de volátiles,
bonificación por reposo, prima de precio por esperar mercado (`marketMult`) y costo
de sostener el arrume (`storeCost`, que se descuenta del ingreso).

**El moho se calcula sobre la humedad promedio del período, no la del último día.**
Se integra la curva de sorción y se usa su media. Sin eso, guardar húmedo en
hermético parece inofensivo —el número final se ve bien porque la barrera frena el
intercambio— y se pierde justo la interacción que la etapa enseña.

**La respuesta del moho al exceso de humedad es un umbral, no una rampa.** `excess`
reparte esa respuesta sobre 1.2 puntos de humedad. Con los 4.5 puntos que tenía antes,
pasarse 0.2 del límite costaba 0.05 de `moldStore` y la retención de aroma del hermético
lo compensaba de sobra: **el hermético ganaba también con grano húmedo**, en los cinco
puntos de la banda 7.8–8.5%. La lección central de la etapa no ocurría en ningún punto
del barrido, aunque la documentación afirmara lo contrario.

**La prima de mercado satura y el costo de bodega no.** `marketMult` era lineal
(+0.45%/día) y no tenía contrapeso: guardar 60 días —el tope del slider— era el óptimo
en los cinco lotes y con cualquier empaque. Con la prima saturante y `HOLD_COST` lineal,
la curva de ingreso contra días **da la vuelta**: el óptimo cae en 15–25 días y depende
del empaque, porque el hermético sostiene la calidad más lejos.

**La regla del empaque no es "hermético solo si secaste bien".** Esa es la mitad seca.
La regla completa es comparar el grano con lo que la bodega le va a imponer:

- Bodega seca (soleado, EMC 6.8%) y grano por encima de `WET_LIMIT`: el saco que
  respira lo baja y el hermético sella el problema. **Gana el fique.**
- Bodega húmeda (lluvioso, EMC 9.0%) y grano en punto: el saco que respira lo *sube*
  hacia la EMC y lo pierde. **Gana el hermético**, incluso a 7.8%.

Las dos direcciones están cubiertas por `test/modelo.js`, que falla si alguna deja de
existir. La segunda es emergente, no está escrita en ninguna parte del modelo.

`offOdor` arrastraba un término constante de 0.10 que castigaba arrumar al piso **con
cero días de bodega**, cuando no hay arrume que castigar, y encima en silencio: la
lectura que lo explica vive en la rama de `storeDays > 0`. Ahora crece con la raíz del
tiempo de contacto desde cero.

## Características Técnicas y Estéticas

- **Estética Clásica Realista Ultra-HD (256×256)**:
  - Texturas procedurales generadas en `<canvas>` al iniciar a resolución 256×256 (650 briznas orgánicas con flores silvestres, estarcido de fique *"CACAO SANTANDER"*, vetas profundas de madera y agregados de concreto).
  - Filtrado bilineal y mipmapping suave (`LinearFilter` / `LinearMipmapLinearFilter`) con anisotropía máxima.
  - Cero archivos de imagen externos (todo generado en memoria por PRNG con semilla determinista).
- **Suelo de Tierra en Una Sola Capa (`DIRT_ZONES` → `dirtCell()`)**:
  - Las zonas de tierra se declaran como rectángulos en `DIRT_ZONES` y se **descomponen en celdas disjuntas**: se cortan por todos los bordes X y Z, y se dibuja la celda cuyo centro cae dentro de alguna zona. Cero solapes por construcción.
  - Todas las celdas comparten altura (`DIRT_Y`) y material, y llevan las **UV en coordenadas de mundo**, de modo que la textura corre continua de una celda a la siguiente sin costura ni rejilla visible.
  - `dirtCell()` escribe la posición **absoluta** en la geometría y deja la malla en el origen. El `patch()` anterior solo corregía la altura y nunca trasladaba la malla: las ocho zonas se dibujaban apiladas en el centro del mapa con las alturas del sitio que les correspondía, y la del cacaotal (20×24, con lomas de 2.5 m) flotaba sobre el patio de secado.
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
| Bodega de almacenamiento | Galpón + estibas + higrómetro | (11.1, 1.0) |
| Bodega de acopio | Mostrador + Báscula | (0.5, 4.0) |
| Estación meteorológica | Garita + Anemómetro | (7.5, 4.5) |
| Árboles (Cacaotal) | Inspección de mazorcas | (-8.5, 3.5) |

El galpón de almacenamiento está en (14.0, 1.0) y **no puede acercarse más al oeste**:
el corredor de patrulla del perro corre recto por `x = 10.4`, y `blocked()` añade
0.25 de margen a cada caja de `SOLIDS`. Un muro en `x < 10.65` deja al perro clavado
contra la pared, porque su IA apunta al waypoint sin *pathfinding*.

`getGroundY()` aplana el terreno con `Math.min` de **dos** explanadas: la del
beneficiadero (radio 6 alrededor de (0.5, 1.5)) y la del galpón (radio 4.6 alrededor
de (14.0, 1.0)). Sin la segunda, el edificio cae sobre una loma de hasta 2.5 m y la
losa flota o se entierra.

## Verificación

**El modelo agronómico tiene pruebas.** Antes y después de tocar `evaluate()` o
cualquier constante de arriba del `<script>`:

```bash
node test/modelo.js
```

Sin dependencias: extrae el bloque MODELO de `fermento.html` y lo barre sobre la
rejilla completa de decisiones. Comprueba lo que CLAUDE.md exige y antes solo estaba
en prosa —que ninguna etapa sea binaria ni tenga estrategia dominante, que las etapas
sigan acopladas en ambas direcciones, que todo castigo traiga su lectura, que toda
variedad anunciada como capaz de fino pueda lograrlo y que las medallas sean
alcanzables— además de que `index.html` siga siendo copia byte a byte.

Cuatro fallos vivían en el repo sin que nadie los viera hasta escribirlo: el trinitario
no podía alcanzar fino de aroma por cinco milésimas, dos medallas eran imposibles por
construcción (`3+ fino` con solo dos lotes capaces, `$2.8M` contra un techo de `$1.38M`),
la bodega tenía estrategia dominante en los cinco lotes, y el hermético ganaba también
con grano húmedo. **Los tres últimos estaban documentados aquí como comportamiento
correcto.**

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
