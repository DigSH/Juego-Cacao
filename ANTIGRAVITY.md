# CACAO — Fermento (Beneficiadero 3D Realista)

Serious game de **postcosecha de cacao** (Charalá, Santander). El jugador explora en primera persona un beneficiadero y cacaotal realista en 3D y gestiona 5 lotes de cacao a través de fermentación → secado → prueba de corte → venta.

## Estructura del Proyecto

- **Todo vive en `fermento.html` e `index.html`**: Proyecto *single-file* (cero dependencias de servidor, cero npm, cero build scripts).
- **GitHub Pages**: Desplegable automáticamente desde la raíz (`/`) sirviendo `index.html`.
- **Dependencias externas por CDN**: Three.js **r128** y Google Fonts.

## Características Técnicas y Estéticas

- **Estética Clásica Realista HD (128×128)**:
  - Texturas procedurales generadas en `<canvas>` al iniciar a resolución 128×128.
  - Filtrado bilineal y mipmapping suave (`LinearFilter` / `LinearMipmapLinearFilter`) con anisotropía máxima.
  - Cero archivos de imagen externos (todo generado en memoria por PRNG con semilla determinista).
- **Modelos 3D Estructurales**:
  - **Cajón de Fermentación**: Tina rectangular de madera reforzada con masa de granos abultada y pala/remo de madera.
  - **Patio de Secado + Marquesina**: Losa de concreto elevada, camillas con bordes de madera, techo acanalado y rastrillo de tendido.
  - **Bodega de Acopio**: Mostrador con báscula de pesaje digital/analógica, costales de fique en 3D (`DodecahedronGeometry`), techo rústico y farol de bronce con luz nocturna.
  - **Estación Meteorológica**: Garita de persianas blancas, pluviómetro, anemómetro giratorio de 3 copas, veleta y tablero de telemetría.
  - **Cacaoteros (*Theobroma cacao*)**: Plantación de 25 cacaoteros distribuidos en el cacaotal (52×44 u), con ramificación en horqueta y mazorcas nacidas directamente en la corteza del tronco (*caulifloria*).
- **Sintetizador de Audio Procedural (`Web Audio API`)**:
  - Efecto de pasos según el terreno al caminar.
  - Ambiente continuo de viento y lluvia sintetizada por filtro de ruido rosa/blanco según el clima.
  - Sonidos de UI: clics en botones, sliders, apertura/cierre de paneles (*bottom-sheets*) y campanada de venta (*chime*).
  - Botón de silenciar/activar en el HUD (`🔊 / 🔇`).
- **Navegación e Interfaz**:
  - **Balizas 3D Flotantes**: Cristales octaédricos giratorios con códigos de color sobre cada estación.
  - **Mini-Brújula en HUD**: Muestra orientación en grados y rumbo (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`).
  - **Atajos**: `ESC` para cerrar paneles, `Shift` para correr (multiplicador ×1.6).
  - **Partículas**: Luciérnagas nocturnas parpadeantes y vapor de fermentación saliendo del cajón.
- **Módulos Educativos y Logros**:
  - **Estación de Inspección de Mazorcas (`panelTree`)**: Diagnóstico de variedades (*Criollo*, *Trinitario*, *CCN-51*) y síntomas de Monilia (*Moniliophthora roreri*).
  - **Guía de Prueba de Corte (*Cut Test*)**: Visualización gráfica de granos Pizarra, Violeta, Marrón Óptimo y Sobrefermentados.
  - **Medallas y Logros**: Sistema de reconocimientos postcosecha al cerrar la campaña de 5 lotes.

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

Para sincronizar `index.html`:
```powershell
Copy-Item fermento.html index.html
```

## Idioma

Toda la UI, comentarios del código y documentación están en **español**.
