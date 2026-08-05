# CACAO — Fermento (Beneficiadero 3D Realista)

Serious game de **postcosecha de cacao** (Charalá, Santander). El jugador explora en primera persona un beneficiadero y cacaotal realista en 3D y gestiona 5 lotes de cacao a través de fermentación → secado → prueba de corte → venta.

## Estructura del Proyecto

- **Todo vive en `fermento.html` e `index.html`**: Proyecto *single-file* (cero dependencias de servidor, cero npm, cero build scripts).
- **GitHub Pages**: Desplegable automáticamente desde la raíz (`/`) sirviendo `index.html`.
- **Dependencias externas por CDN**: Three.js **r128** y Google Fonts.

## Características Técnicas y Estéticas

- **Estética Clásica Realista Ultra-HD (256×256)**:
  - Texturas procedurales generadas en `<canvas>` al iniciar a resolución 256×256 (650 briznas orgánicas con flores silvestres, estarcido de fique *"CACAO SANTANDER"*, vetas profundas de madera y agregados de concreto).
  - Filtrado bilineal y mipmapping suave (`LinearFilter` / `LinearMipmapLinearFilter`) con anisotropía máxima.
  - Cero archivos de imagen externos (todo generado en memoria por PRNG con semilla determinista).
- **Relieve y Elevación 3D del Terreno**:
  - Función de elevación matemática `getGroundY(x, z)` con colinas y lomas en el cacaotal (+0.5 m a +2.5 m) y beneficiadero nivelado.
  - Normales recalculadas (`computeVertexNormals`) para sombras realistas y física de movimiento que adapta la altura del jugador al terreno.
- **Modelación y Física de Colisiones 3D**:
  - Detección de colisiones circular para los 25 cacaoteros, cajas delimitadoras para las estaciones 3D (Cajón, Patio + Marquesina, Bodega + Báscula + Sacos, Estación Met, Perro) y límites del mapa (52×44 u).
- **Personaje Seleccionable y Brazos 3D (*Viewmodel 1ª Persona*)**:
  - Selección entre **Mateo** (granjero con camisa azul) y **Valentina** (granjera con camisa roja).
  - Brazos 3D ergonómicos en vista de 1ª persona con herramienta de madera y animación de inercia y balanceo natural al caminar.
- **Fauna con IA de Comportamiento Autónomo**:
  - **Perro de Finca (Compañero/Patrulla)**: Trota autónomamente entre estaciones y sigue al jugador al acercarse, moviendo la cola y ladrando.
  - **Bandada de Pájaros (Boids AI)**: Vuelan en curvas armónicas ajustando velocidad de aleteo según ascenso/descenso.
  - **Mariposas Botánicas**: Revolotean entre árboles y realizan posados periódicos en las hojas y mazorcas.
- **Iluminación de Escena Equilibrada**:
  - **AmbientLight** (`ambLight`) combinada con **HemisphereLight**, sol y **moonLight** para eliminar caras en negro sólido en sombras e interiores.
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

Para sincronizar `index.html`:
```powershell
Copy-Item fermento.html index.html
```

## Idioma

Toda la UI, comentarios del código y documentación están en **español**.
