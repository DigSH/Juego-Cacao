# CACAO — Fermento (Beneficiadero 3D Realista)

Serious game de **postcosecha de cacao** (Charalá, Santander).

Documentación técnica completa en [ANTIGRAVITY.md](./ANTIGRAVITY.md).

## Resumen del Proyecto

- **Motor**: HTML5 + Three.js r128 (CDN) + Web Audio API sintético.
- **Formato**: *single-file*. Todo el juego vive dentro de `fermento.html`.
- **Despliegue**: GitHub Pages sirve `index.html` desde la raíz de `main`.
- **Idioma**: UI, comentarios del código y documentación en **español**.

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

## Trabajo concurrente

Este repositorio también lo edita **Antigravity** en la misma carpeta. Antes de
empezar conviene `git fetch` y `git log --oneline -5` para no partir de una base
obsoleta ni pisar sus commits.
