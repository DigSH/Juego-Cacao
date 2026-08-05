# CACAO — Fermento (Beneficiadero 3D Realista)

 Serious game de **postcosecha de cacao** (Charalá, Santander).

Documentación técnica completa disponible en [ANTIGRAVITY.md](file:///C:/Users/diego/OneDrive/Documentos/JUEGOS/CACAO/ANTIGRAVITY.md).

## Resumen del Proyecto

- **Motor**: HTML5 + Three.js r128 (CDN) + Web Audio API sintético.
- **Formato**: Un solo archivo ejecutable en navegador (`fermento.html` / `index.html`).
- **Despliegue**: Publicado automáticamente en GitHub Pages en [https://digsh.github.io/Juego-Cacao/](https://digsh.github.io/Juego-Cacao/).

## Verificación

```bash
node -e "const fs = require('fs'); const html = fs.readFileSync('fermento.html', 'utf8'); const script = html.substring(html.indexOf('<script>')+8, html.lastIndexOf('</script>')); new Function(script);"
```
