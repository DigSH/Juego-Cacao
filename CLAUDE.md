# CACAO — Fermento (Beneficiadero 3D Realista)

Serious game de **postcosecha de cacao** (Charalá, Santander).

Documentación técnica completa en [ANTIGRAVITY.md](./ANTIGRAVITY.md).

## Resumen del Proyecto

- **Motor**: HTML5 + Three.js r128 (CDN) + Web Audio API sintético.
- **Formato**: *single-file*. Todo el juego vive dentro de `fermento.html`.
- **Despliegue**: GitHub Pages sirve `index.html` desde la raíz de `main`.
- **Idioma**: UI, comentarios del código y documentación en **español**.
- **Cadena que se simula**: fermentación → secado → almacenamiento → predicción →
  prueba de corte → venta, sobre 5 lotes con variedad, monilia y clima propios.

Es *aprendizaje basado en juegos digitales* (DGBL), **no gamificación**: las
mecánicas son el contenido. Las medallas del cierre de campaña son la única capa
gamificada. Al añadir una función, la pregunta no es "¿qué recompensa doy?" sino
"¿qué relación agronómica obliga a entender?".

## Reglas al editar el motor

### 1. `index.html` es una copia byte a byte de `fermento.html`

Edita siempre `fermento.html` y sincroniza **antes** de commitear. Si divergen,
lo publicado en GitHub Pages deja de ser lo que probaste.

```powershell
Copy-Item fermento.html index.html
```

### 2. La verificación de sintaxis NO basta

```bash
node -e "const fs = require('fs'); const html = fs.readFileSync('fermento.html', 'utf8'); const script = html.substring(html.indexOf('<script>')+8, html.lastIndexOf('</script>')); new Function(script);"
```

`new Function()` **solo compila, no ejecuta**. No detecta errores de tiempo de
ejecución. Una *temporal dead zone* (usar un `const`/`let` antes de su
declaración) pasa esta verificación y aun así aborta `boot()` entero: el lienzo
queda en **negro sólido** y el HUD se queda con sus valores estáticos del HTML.

**Hay que abrir la página y mirar la consola.** Ver [ANTIGRAVITY.md](./ANTIGRAVITY.md#verificación)
para el comando de Chrome headless cuando no hay navegador a mano.

Para probar **lógica de juego** en headless, inyecta sondas en una **copia** dentro
del scratchpad, nunca en el archivo del proyecto. Como casi todo es local a `boot()`
(ver §3), la copia necesita abrir el cierre con un reemplazo de texto sobre
`window.startGame=function(){`, anteponiéndole:

```js
window.__dbg={player,camera,dec,evaluate,getGroundY,blocked,applyCam,STATIONS};
```

Con eso se puede teletransportar la cámara para fotografiar una zona concreta
(`player.yaw=-Math.PI/2` mira al **+X**), barrer el modelo por código y disparar
`new KeyboardEvent('keydown',{key:'e'})` para abrir paneles sin caminar.

Ojo: headless renderiza a ~3 fps y el `dt` acumulado va muy por detrás del tiempo
real. La lógica dependiente del tiempo hay que simularla con paso fijo, no esperando
a `requestAnimationFrame`.

### 3. Casi todo vive dentro de `boot()`

`boot()` es una función enorme; sus variables (`paused`, `loadLot`, `player`,
`scene`…) **no** son globales. El código de la pantalla de inicio (`selectChar`,
`enter`) sí está en el ámbito global y no puede alcanzarlas: el puente es
`window.startGame()`, que `boot()` publica al final.

Cuidado con los guardias tipo `if(typeof loadLot==='function')`: si la función
está fuera de alcance, **fallan en silencio** y el síntoma aparece lejos de la causa.

### 4. Al añadir objetos al mundo

- Declara los arrays de estado (`TREES`, etc.) **antes** del código que los llena.
- Si algo se mueve, no le pongas una caja fija en `SOLIDS`: se queda donde
  arrancó y deja un muro invisible.
- Todo lo que camina debe usar `blocked(x,z)` y `getGroundY(x,z)` en cada cuadro.
- Una caja nueva en `SOLIDS` no puede cruzar los tramos rectos que unen los
  waypoints de `DOG_WPS` (el rectángulo x ∈ [-2, 10.4], z ∈ [-5.4, 7.2]), con
  0.25 de margen. El perro no tiene *pathfinding*: se clava contra la pared.
- Un edificio fuera de las explanadas de `getGroundY()` queda sobre una loma y su
  losa flota. Añade su zona plana a la cadena de `Math.min` de esa función.

### 5. Al tocar el modelo agronómico

Toda la simulación vive en `evaluate(lot, d)` y en las constantes de arriba del
`<script>` (`K`, `BOX_HEAT`, `DRY_K`, `STORE_HR`, `PACK_K`…), **fuera de `boot()`**.
Es la única parte del código que se puede probar sin renderizar nada.

- **Las etapas tienen que seguir acopladas.** El valor didáctico está en que una
  decisión buena en aislamiento sea mala dada la etapa anterior: el empaque
  hermético solo conviene si el secado ya bajó de `WET_LIMIT`; con grano húmedo
  sella el problema. Una etapa cuyo óptimo no dependa de las demás no enseña nada.
- **Ningún parámetro puede volver una etapa binaria.** Si con cierto clima toda
  elección lleva al rechazo, no hay nada que aprender. Calíbralo barriendo la
  rejilla completa de decisiones por clima y comprobando que existe un óptimo y que
  el default seguro no es catastrófico.
- **Cuidado con la variable de estado que se integra.** El moho usa la humedad
  *promedio* del almacenamiento, no la del último día: con el valor final, guardar
  húmedo en hermético parece inofensivo y desaparece la interacción que enseña.
- `evaluate()` devuelve además el arreglo `why`, que es lo que el jugador realmente
  lee. Todo efecto nuevo necesita su mensaje o el castigo resulta arbitrario.

## Trabajo concurrente

Este repositorio también lo edita **Antigravity** en la misma carpeta. Antes de
empezar conviene `git fetch` y `git log --oneline -5` para no partir de una base
obsoleta ni pisar sus commits.
