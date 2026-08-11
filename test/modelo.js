/* Pruebas de calibración del modelo agronómico de CACAO — Fermento.
 *
 *   node test/modelo.js
 *
 * Sin dependencias: extrae el bloque MODELO de fermento.html tal como documenta
 * CLAUDE.md y lo evalúa sobre la rejilla completa de decisiones.
 *
 * Existe porque las reglas de calibración de CLAUDE.md ("ningún parámetro puede
 * volver una etapa binaria", "las etapas tienen que seguir acopladas") solo estaban
 * escritas en prosa, y el barrido que las comprueba había que acordarse de correrlo.
 * Cuatro fallos vivían en el repo sin que nadie los viera: el trinitario no podía
 * alcanzar fino de aroma por cinco milésimas, dos medallas eran inalcanzables por
 * construcción, la bodega tenía una estrategia dominante en los cinco lotes, y el
 * empaque hermético ganaba también con grano húmedo —justo la lección que esa etapa
 * existe para enseñar.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'fermento.html'), 'utf8');

/* ---------- infraestructura mínima de aserciones ---------- */
let fallos = 0, pasadas = 0;
function ok(cond, nombre, detalle) {
  if (cond) { pasadas++; console.log('  ✓ ' + nombre); }
  else { fallos++; console.log('  ✗ ' + nombre + (detalle ? '\n      ' + detalle : '')); }
}
function grupo(nombre) { console.log('\n' + nombre); }

/* ---------- carga del modelo ---------- */
const iniModelo = HTML.indexOf('/* ===================== MODELO');
const finModelo = HTML.indexOf('/* ===================== SINTETIZADOR');
const fuenteModelo = HTML.substring(iniModelo, finModelo);
const M = new Function(fuenteModelo +
  '\nreturn {evaluate,VARIETIES,LOTS,K,WET_LIMIT,FINO_POT,FINO_AROMA,MARKET_MAX,HOLD_COST};')();
const { evaluate, VARIETIES, LOTS, K, WET_LIMIT, FINO_POT } = M;

/* El ruido de precio (±5%) hace irreproducible cualquier comparación. Se fija para
   todo el barrido: el grado nunca depende de él, solo el ingreso. */
Math.random = () => 0.5;

/* ---------- rejilla de decisiones (los rangos reales de los sliders) ---------- */
const G = {
  fermDays:  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  volteos:   [0, 1, 2, 3, 4, 5],
  cajon:     ['madera', 'microlote', 'canasto'],
  dryDays:   [0, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  secado:    ['sol', 'marquesina', 'artificial'],
  storeDays: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
  empaque:   ['fique', 'polipropileno', 'hermetico'],
  estiba:    ['estiba', 'piso'],
};
function* rejilla(fijo) {
  const ejes = Object.keys(G);
  const vals = ejes.map(e => (fijo && e in fijo) ? [fijo[e]] : G[e]);
  const n = ejes.length, i = new Array(n).fill(0);
  for (;;) {
    const d = {}; for (let k = 0; k < n; k++) d[ejes[k]] = vals[k][i[k]];
    yield d;
    let k = n - 1;
    while (k >= 0 && ++i[k] === vals[k].length) { i[k] = 0; k--; }
    if (k < 0) return;
  }
}
/* Resume el barrido de un lote en una sola pasada. */
function barrer(lot, fijo) {
  const r = { n: 0, mejor: -Infinity, mejorD: null, peor: Infinity, fino: 0, rechazo: 0, sinPorque: 0, rechazoMudo: 0 };
  for (const d of rejilla(fijo)) {
    const e = evaluate(lot, d);
    r.n++;
    if (e.revenue > r.mejor) { r.mejor = e.revenue; r.mejorD = d; }
    if (e.revenue < r.peor) r.peor = e.revenue;
    if (e.grade === 'Fino de aroma') r.fino++;
    if (e.grade === 'Pasilla / rechazo') {
      r.rechazo++;
      if (!e.why.some(([, t]) => /moho|amon|plaga|piso|sobre-seco|sella/i.test(t))) r.rechazoMudo++;
    }
    if (!e.why || !e.why.length) r.sinPorque++;
  }
  return r;
}
const letra = i => String.fromCharCode(65 + i);
const mil = n => Math.round(n / 1000) + 'k';

/* ================================================================= */
grupo('Despliegue');

const INDEX = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
ok(INDEX === HTML,
  'index.html es copia byte a byte de fermento.html',
  'Divergen (' + HTML.length + ' vs ' + INDEX.length + ' bytes). Lo publicado en GitHub Pages ' +
  'no es lo que probaste: Copy-Item fermento.html index.html');

/* new Function() solo compila; no detecta errores de ejecución (ver CLAUDE.md §2).
   Vale como red mínima, no como verificación. */
let compila = true, errCompila = '';
try { new Function(HTML.substring(HTML.indexOf('<script>') + 8, HTML.lastIndexOf('</script>'))); }
catch (e) { compila = false; errCompila = e.message; }
ok(compila, 'el <script> compila', errCompila);

/* ================================================================= */
grupo('Grado fino de aroma: alcanzable por toda variedad con potencial');

/* Regresión directa del fallo: FINO_AROMA estaba en 0.62 y el trinitario topaba en
   0.615, así que pasaba la puerta de potencial (V.aroma >= FINO_POT) y aun así no
   podía llegar nunca. Una variedad presentada como capaz tiene que poder lograrlo. */
const finoPorVariedad = {};
for (const v of Object.keys(VARIETIES)) {
  const lot = { variety: v, monilia: 0.06, weather: 'soleado', kg: 55 };
  let n = 0, techoAroma = 0;
  for (const d of rejilla()) {
    const e = evaluate(lot, d);
    if (e.grade === 'Fino de aroma') n++;
    if (e.profile.Aroma > techoAroma) techoAroma = e.profile.Aroma;
  }
  finoPorVariedad[v] = { n, techoAroma, pot: VARIETIES[v].aroma };
}
for (const [v, r] of Object.entries(finoPorVariedad)) {
  const nombre = VARIETIES[v].name;
  if (r.pot >= FINO_POT) {
    ok(r.n > 0, nombre + ' (potencial ' + r.pot + ' ≥ ' + FINO_POT + ') puede alcanzar fino de aroma',
      'techo de aroma logrado ' + r.techoAroma.toFixed(3) + ' contra una puerta de ' + M.FINO_AROMA +
      '. La variedad está anunciada como capaz y es inalcanzable.');
  } else {
    ok(r.n === 0, nombre + ' (potencial ' + r.pot + ' < ' + FINO_POT + ') nunca alcanza fino de aroma',
      'alcanzó fino en ' + r.n + ' combinaciones: la puerta de potencial varietal no está filtrando.');
  }
}
/* Y el grado tiene que discriminar entre variedades, o elegir bien el lote da igual. */
const fCriollo = finoPorVariedad.criollo.n, fTrinitario = finoPorVariedad.trinitario.n;
ok(fCriollo > fTrinitario * 2,
  'el criollo llega a fino bastante más fácil que el trinitario',
  'criollo ' + fCriollo + ' vs trinitario ' + fTrinitario + ' combinaciones: los perfiles de ' +
  'variedad dejaron de distinguirse y elegir cómo tratar cada lote no cambia nada.');

/* ================================================================= */
grupo('Ninguna etapa es binaria ni tiene estrategia dominante');

const resumen = LOTS.map((lot, i) => ({ i, lot, r: barrer(lot) }));
for (const { i, lot, r } of resumen) {
  const nom = 'Lote ' + letra(i) + ' (' + VARIETIES[lot.variety].name + ', ' + lot.weather + ')';
  ok(r.rechazo < r.n,
    nom + ': existe al menos una decisión que no termina en rechazo',
    'las ' + r.n + ' combinaciones acaban en pasilla: con este clima no hay nada que aprender.');
  ok(r.mejor > r.peor,
    nom + ': existe un óptimo estricto',
    'todas las decisiones rinden lo mismo (' + mil(r.mejor) + '): la etapa no decide nada.');
}

/* La bodega es la etapa que se rompió: con prima lineal y sin costo, guardar 60 días
   —el extremo del slider— era el óptimo en los cinco lotes y con cualquier empaque.
   Un óptimo pegado al tope del rango es la firma de un parámetro sin contrapeso. */
const TOPE = G.storeDays[G.storeDays.length - 1];
for (const { i, lot, r } of resumen) {
  const nom = 'Lote ' + letra(i);
  ok(r.mejorD.storeDays < TOPE,
    nom + ': el óptimo de bodega no está pegado al tope del slider',
    'óptimo en ' + r.mejorD.storeDays + ' d (el máximo del rango): la prima de mercado no ' +
    'tiene contrapeso y guardar siempre más es siempre mejor.');
}
/* Y la curva de ingreso contra días tiene que dar la vuelta, no crecer sin fin. */
for (const { i, lot, r } of resumen) {
  const fijo = Object.assign({}, r.mejorD);
  const curva = G.storeDays.map(sd => evaluate(lot, Object.assign({}, fijo, { storeDays: sd })).revenue);
  const iMax = curva.indexOf(Math.max.apply(null, curva));
  ok(iMax > 0 && iMax < curva.length - 1,
    'Lote ' + letra(i) + ': la curva de ingreso contra días de bodega tiene un máximo interior',
    'máximo en ' + G.storeDays[iMax] + ' d, un extremo del rango. Curva: ' + curva.map(mil).join(' '));
}

/* ================================================================= */
grupo('Las etapas siguen acopladas');

/* El valor didáctico de la bodega es que el empaque correcto depende del secado y del
   aire de la bodega, no de una regla fija. Tienen que existir las dos direcciones. */
let ganaFique = null, ganaHermetico = null;
for (const w of ['soleado', 'variable', 'lluvioso']) {
  const lot = { variety: 'trinitario', monilia: 0.06, weather: w, kg: 55 };
  for (const dryDays of G.dryDays) for (const secado of G.secado) {
    const base = { fermDays: 5, volteos: 3, cajon: 'madera', dryDays, secado, storeDays: 30, estiba: 'estiba' };
    const seco = evaluate(lot, Object.assign({}, base, { storeDays: 0, empaque: 'fique' })).finalMoisture;
    const f = evaluate(lot, Object.assign({}, base, { empaque: 'fique' }));
    const h = evaluate(lot, Object.assign({}, base, { empaque: 'hermetico' }));
    if (seco > WET_LIMIT && seco < K.MOLD_THRESHOLD && f.revenue > h.revenue && !ganaFique)
      ganaFique = { w, dryDays, secado, seco, f: f.grade, h: h.grade };
    if (seco <= WET_LIMIT && h.revenue > f.revenue && !ganaHermetico)
      ganaHermetico = { w, dryDays, secado, seco, f: f.grade, h: h.grade };
  }
}
ok(ganaFique !== null,
  'con grano por encima de WET_LIMIT y bodega seca, el saco que respira gana al hermético',
  'el hermético gana en TODA la banda ' + WET_LIMIT + '–' + K.MOLD_THRESHOLD + '%. La lección ' +
  'central de la etapa —sella el problema en vez de resolverlo— no ocurre en ningún punto del barrido.');
if (ganaFique) console.log('      caso: ' + ganaFique.w + ' ' + ganaFique.secado + ' ' + ganaFique.dryDays +
  'd → patio ' + ganaFique.seco.toFixed(2) + '% · fique ' + ganaFique.f + ' vs hermético ' + ganaFique.h);
ok(ganaHermetico !== null,
  'con grano bien seco, el hermético gana al saco que respira',
  'el hermético no aventaja al fique en ningún punto: la etapa premia siempre lo mismo.');

/* Vender el mismo día no puede castigar por el arrume: no hay arrume que castigar.
   (offOdor arrastraba un término constante de 0.10 que cambiaba el grado a 0 días,
   y encima sin mensaje, porque la lectura vive en la rama de storeDays > 0.) */
let estibaImportaSinBodega = null;
for (const lot of LOTS) {
  for (const d of rejilla({ storeDays: 0, estiba: 'estiba' })) {
    const a = evaluate(lot, d);
    const b = evaluate(lot, Object.assign({}, d, { estiba: 'piso' }));
    if (a.grade !== b.grade) { estibaImportaSinBodega = { d, a: a.grade, b: b.grade }; break; }
  }
  if (estibaImportaSinBodega) break;
}
ok(estibaImportaSinBodega === null,
  'con 0 días de bodega, arrumar sobre estiba o al piso no cambia el grado',
  estibaImportaSinBodega ? 'estiba → ' + estibaImportaSinBodega.a + ' pero piso → ' +
    estibaImportaSinBodega.b + ' sin haber arrumado nada.' : '');

/* ================================================================= */
grupo('Todo castigo trae su lectura');

for (const { i, r } of resumen) {
  ok(r.sinPorque === 0, 'Lote ' + letra(i) + ': ninguna decisión devuelve un why vacío',
    r.sinPorque + ' combinaciones sin explicación.');
  ok(r.rechazoMudo === 0, 'Lote ' + letra(i) + ': todo rechazo dice cuál fue el defecto',
    r.rechazoMudo + ' rechazos sin mensaje que los explique: el castigo resulta arbitrario.');
}

/* ================================================================= */
grupo('Medallas y defaults');

/* Los umbrales se leen del propio motor para que no se puedan desincronizar. */
const umbralPlata = +/total>=(\d+)\)badges/.exec(HTML)[1];
const umbralFino = +/if\(fino>=(\d+)\)badges/.exec(HTML)[1];
const maxTotal = resumen.reduce((s, x) => s + x.r.mejor, 0);
const lotesFino = resumen.filter(x => x.r.fino > 0).length;

ok(maxTotal >= umbralPlata,
  'la medalla de ingreso (' + mil(umbralPlata) + ') es alcanzable',
  'el máximo teórico de la campaña es ' + mil(maxTotal) + ': la medalla es imposible por construcción.');
ok(umbralPlata >= maxTotal * 0.6,
  'la medalla de ingreso no se regala',
  'pide ' + mil(umbralPlata) + ' contra un máximo de ' + mil(maxTotal) + ' (' +
  Math.round(100 * umbralPlata / maxTotal) + '%): sale sola.');
ok(lotesFino >= umbralFino,
  'la medalla de ' + umbralFino + '+ fino es alcanzable',
  'solo ' + lotesFino + ' de los ' + LOTS.length + ' lotes pueden llegar a fino de aroma.');

/* El default de partida no puede ser una trampa: el jugador que abre el panel y no
   toca nada tiene que salir mal, no descalificado. (loadLot() ya no reimpone las
   decisiones en cada lote; solo importa el primero.) */
const DEC0 = new Function('return ' + /const DEC0=(\{[^}]*\})/.exec(HTML)[1])();
const rDefault = evaluate(LOTS[0], DEC0);
ok(rDefault.grade !== 'Pasilla / rechazo',
  'el default de partida no es catastrófico en el primer lote',
  'sale ' + rDefault.grade + ' con ' + rDefault.finalMoisture.toFixed(1) + '% de humedad.');

/* ================================================================= */
console.log('\n' + '─'.repeat(60));
console.log('  máximo teórico de campaña: ' + mil(maxTotal) +
  '  ·  lotes capaces de fino: ' + lotesFino + '/' + LOTS.length);
for (const { i, lot, r } of resumen) {
  console.log('  Lote ' + letra(i) + ' ' + VARIETIES[lot.variety].name.padEnd(18) + lot.weather.padEnd(10) +
    ' óptimo ' + mil(r.mejor).padStart(5) + ' @ ' + r.mejorD.storeDays + 'd/' + r.mejorD.empaque +
    '  · rechazo ' + Math.round(100 * r.rechazo / r.n) + '%  · fino ' + (100 * r.fino / r.n).toFixed(2) + '%');
}
console.log('─'.repeat(60));
console.log(fallos === 0 ? '\n' + pasadas + ' pruebas, todo en orden.\n'
  : '\n' + fallos + ' de ' + (fallos + pasadas) + ' pruebas fallaron.\n');
process.exit(fallos === 0 ? 0 : 1);
