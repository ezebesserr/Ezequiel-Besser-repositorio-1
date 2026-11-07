// Recorrido a pie para visitar prospectos, a partir de un lote de auditorías (auditoria.js --lote).
// Uso: node ruta.js <carpeta-del-lote> [--desde "-34.5106,-58.4908"] [--linea web|presencia] [--paradas 4] [--salida <carpeta>]
// Ordena los locales para caminar lo menos posible y deja, en la carpeta del lote (o en --salida):
//   ruta.pdf      para el celular: un toque por tramo abre Google Maps a pie, y en cada local qué decir y qué ofrecer
//   imprimir.pdf  las hojas de auditoría en el mismo orden, para imprimir y dejar en cada local
//   ruta.html     lo mismo que ruta.pdf
// Sin --desde, el primer tramo arranca desde donde estés. Cada tramo tiene hasta 4 locales (--paradas), para que el
// link abra bien también en el navegador del celular.
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');

function args() {
  const a = process.argv.slice(2), o = { _: [] };
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1]; i++; } else o._.push(a[i]); }
  return o;
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function perfil() {
  try {
    const md = fs.readFileSync(path.join(REPO, 'creador/negocio/perfil.md'), 'utf8');
    const c = n => { const m = new RegExp('\\*\\*' + n + '\\*\\*:\\s*(.+)').exec(md); const v = m ? m[1].trim() : ''; return /completar/i.test(v) ? '' : v.replace(/\s*\(si firman.*$/i, ''); };
    return { firma: c('Nombre para firmar'), presentacion: c('Presentación') };
  } catch (e) { return {}; }
}

function km(a, b) {
  const r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
function largo(ruta, inicio) { let d = 0, prev = inicio; for (const p of ruta) { if (prev) d += km(prev, p); prev = p; } return d; }
// Vecino más cercano y después 2-opt sobre el camino abierto: con 10 a 30 locales sale en el acto.
function ordenar(puntos, inicio) {
  if (puntos.length < 2) return puntos.slice();
  let resto = puntos.slice(), ruta = [], actual = inicio;
  if (!actual) {
    const c = { lat: resto.reduce((s, p) => s + p.lat, 0) / resto.length, lon: resto.reduce((s, p) => s + p.lon, 0) / resto.length };
    resto.sort((a, b) => km(c, b) - km(c, a)); actual = resto.shift(); ruta.push(actual);
  }
  while (resto.length) { resto.sort((a, b) => km(actual, a) - km(actual, b)); actual = resto.shift(); ruta.push(actual); }
  for (let mejoro = true; mejoro;) {
    mejoro = false;
    for (let i = 0; i < ruta.length - 1; i++) for (let j = i + 1; j < ruta.length; j++) {
      const nueva = ruta.slice(0, i).concat(ruta.slice(i, j + 1).reverse(), ruta.slice(j + 1));
      if (largo(nueva, inicio) + 1e-9 < largo(ruta, inicio)) { ruta = nueva; mejoro = true; }
    }
  }
  return ruta;
}
const coord = p => p.lat.toFixed(6) + ',' + p.lon.toFixed(6);
function linkTramo(t) {
  const dest = t.paradas[t.paradas.length - 1], via = t.paradas.slice(0, -1);
  let u = 'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=' + encodeURIComponent(coord(dest));
  if (t.origen) u += '&origin=' + encodeURIComponent(coord(t.origen));
  if (via.length) u += '&waypoints=' + encodeURIComponent(via.map(coord).join('|'));
  return u;
}
const linkFicha = p => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([p.negocio, p.direccion || p.zona].filter(Boolean).join(', '));
function duracion(min) { const h = Math.floor(min / 60), m = Math.round(min % 60 / 5) * 5; return (h ? h + ' h ' : '') + (m ? m + ' min' : (h ? '' : '5 min')); }

(async () => {
  const o = args();
  const carpeta = o._[0] && path.resolve(o._[0]);
  if (!carpeta || !fs.existsSync(path.join(carpeta, 'lote.json'))) {
    console.error('Uso: node ruta.js <carpeta-del-lote> [--desde "lat,lon"] [--linea web|presencia] [--paradas 4] [--salida <carpeta>]');
    console.error('La carpeta es la salida de auditoria.js --lote (tiene que tener lote.json).');
    process.exit(1);
  }
  const salida = path.resolve(o.salida || carpeta);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La salida va fuera del repo, que es público.'); process.exit(1); }
  fs.mkdirSync(salida, { recursive: true });
  const P = perfil();
  const porTramo = Math.max(1, Math.min(9, Number(o.paradas) || 4));
  let inicio = null;
  if (o.desde) {
    const m = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(o.desde);
    if (!m) { console.error('--desde va como "latitud,longitud", por ejemplo "-34.5106,-58.4908" (en Google Maps: mantené apretado el punto y copiá los números).'); process.exit(1); }
    inicio = { lat: Number(m[1]), lon: Number(m[2]), negocio: 'Inicio' };
  }

  const lote = JSON.parse(fs.readFileSync(path.join(carpeta, 'lote.json'), 'utf8'));
  const elegidos = lote.filter(x => !x.error && (!o.linea || x.linea === o.linea));
  const conLugar = elegidos.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon));
  const sinLugar = elegidos.filter(x => !(Number.isFinite(x.lat) && Number.isFinite(x.lon)));
  if (!conLugar.length) { console.error('Ningún local tiene ubicación. Corré geo.py y pasale --zonas a auditoria.js --lote.'); process.exit(1); }

  const ruta = ordenar(conLugar, inicio);
  const tramos = [];
  for (let k = 0, origen = inicio; k < ruta.length; k += porTramo) {
    const paradas = ruta.slice(k, k + porTramo);
    tramos.push({ origen, paradas, desde: k + 1, hasta: k + paradas.length });
    origen = paradas[paradas.length - 1];
  }
  const distancia = largo(ruta, inicio) * 1.3; // las cuadras no son en línea recta
  const minutos = distancia / 4.5 * 60 + 10 * ruta.length;
  const zonas = [...new Set(ruta.map(x => (x.zona || '').split(' · ')[0]).filter(Boolean))].slice(0, 3).join(', ');
  const fecha = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  const yo = (P.firma || '<tu nombre>') + (P.presentacion ? ', ' + P.presentacion.charAt(0).toLowerCase() + P.presentacion.slice(1) + ',' : '');

  // El guion es igual para todos salvo la observación, que va resaltada.
  const guion = x => x.linea === 'presencia'
    ? esc(`«Hola, buen día. ¿Está el dueño o el encargado? Me llamo ${yo} y ayudo a comercios de la zona a que los encuentren en Google. `) + '<b>Su página se ve bien</b>' + esc('; lo que les puedo dejar al día es la ficha de Google Maps y las reseñas. Si quiere, le muestro cómo aparecen hoy.»')
    : esc(`«Hola, buen día. ¿Está el dueño o el encargado? Me llamo ${yo} y hago páginas web para comercios de la zona. Entré a su página y vi que `) + '<b>' + esc(x.observacion) + '</b>' + esc('. Le dejo esta hoja con cómo la ve un cliente desde el celular. Si le sirve, le armo una muestra sin cargo con sus datos y la ve antes de decidir nada.»');

  const paradaHTML = (x, n) => `<article class="parada">
  <div class="num">${n}</div>
  <div class="cuerpo">
    <h3>${esc(x.negocio)}</h3>
    <p class="dato">${esc([x.rubro, x.direccion || x.zona].filter(Boolean).join(' · '))}</p>
    ${x.telefono ? `<p class="dato">Tel. ${esc(x.telefono)}</p>` : ''}
    <p class="links"><a href="${esc(linkFicha(x))}">¿Sigue abierto? Ver en Maps</a></p>
    <p class="eti">${x.linea === 'presencia' ? 'Ofrecer: Presencia en Google' : 'Ofrecer: web nueva, con muestra sin cargo'}</p>
    <p class="guion">${guion(x)}</p>
    <ul class="marcas"><li>Hablé con el dueño</li><li>Dejé la hoja</li><li>Volver otro día</li><li>Quiere la muestra</li></ul>
  </div>
</article>`;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recorrido a pie · ${esc(zonas)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Chivo+Mono:wght@400;600&family=Chivo:wght@800;900&display=swap">
<style>
  :root{--tinta:#182019;--gris:#4f5a52;--linea:#cfd6d1;--birome:#2342ac;--fondo:#f3f4f2}
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:110mm 240mm;margin:9mm 8mm}
  body{background:#fff;color:var(--tinta);font:15px/1.4 "Alegreya Sans",system-ui,sans-serif;max-width:560px;margin:0 auto;padding:16px}
  @media print{body{padding:0}}
  .eti{font:600 11px/1.3 "Chivo Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:var(--gris)}
  h1{font:900 26px/1.05 "Chivo",sans-serif;margin:4px 0 8px}
  .resumen{color:var(--gris)}
  h2{font:800 18px/1.2 "Chivo",sans-serif;margin:18px 0 8px;break-after:avoid}
  .tramos{list-style:none;display:grid;gap:8px}
  .tramos a{display:block;padding:10px 12px;border:2px solid var(--birome);border-radius:3px;color:var(--birome);text-decoration:none;font-weight:700}
  .tramos small{display:block;font-weight:400;color:var(--gris)}
  .parada{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;padding:12px 0;border-top:1px solid var(--linea);break-inside:avoid}
  .num{font:900 20px/30px "Chivo",sans-serif;text-align:center;background:var(--tinta);color:#fff;border-radius:50%;width:30px;height:30px}
  h3{font:800 17px/1.2 "Chivo",sans-serif}
  .dato{color:var(--gris);font-size:14px;overflow-wrap:anywhere}
  .links a{color:var(--birome);font-size:14px}
  .parada .eti{margin-top:6px;color:var(--birome)}
  .guion{margin-top:4px;padding:8px 10px;background:var(--fondo);border-left:3px solid var(--birome);font-size:14.5px}
  .guion b{background:#fff3b0;font-weight:700}
  .marcas{list-style:none;display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:13px;color:var(--gris)}
  .marcas li::before{content:"";display:inline-block;width:11px;height:11px;border:1.5px solid var(--gris);margin-right:5px;vertical-align:-1px}
  .pie{margin-top:16px;padding-top:10px;border-top:2px solid var(--tinta);font-size:14px}
</style></head><body>
<p class="eti">Recorrido a pie · ${esc(fecha)}</p>
<h1>${ruta.length} ${ruta.length === 1 ? 'local' : 'locales'}${zonas ? ' en ' + esc(zonas) : ''}</h1>
<p class="resumen">Unos ${distancia.toFixed(1).replace('.', ',')} km caminando. Contando 10 minutos por local, ${duracion(minutos)}. Llevá impresas las hojas de <b>imprimir.pdf</b>, en este mismo orden.</p>
<h2>Abrir en Google Maps</h2>
<ol class="tramos">${tramos.map((t, i) => `<li><a href="${esc(linkTramo(t))}">Tramo ${i + 1}: ${t.desde === t.hasta ? 'local ' + t.desde : 'locales ' + t.desde + ' a ' + t.hasta}<small>${esc(t.paradas.map(p => p.negocio).join(' → '))}${!t.origen ? ' · desde donde estés' : ''}</small></a></li>`).join('')}</ol>
<h2>En cada local</h2>
${ruta.map((x, i) => paradaHTML(x, i + 1)).join('\n')}
${sinLugar.length ? `<h2>Sin ubicación</h2><p class="resumen">Estos no tienen dirección cargada: buscalos en Maps antes de salir.</p>${sinLugar.map((x, i) => paradaHTML(x, ruta.length + i + 1)).join('\n')}` : ''}
<p class="pie">Al volver, contame qué pasó en cada uno (con el número alcanza: «3 quiere la muestra, 5 volver el jueves») y lo dejo cargado en el Mostrador con su próximo paso.</p>
</body></html>`;

  fs.writeFileSync(path.join(salida, 'ruta.html'), html);
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(salida, 'ruta.html'), { waitUntil: 'load' }); await p.waitForTimeout(600);
  await p.pdf({ path: path.join(salida, 'ruta.pdf'), width: '110mm', height: '240mm', printBackground: true, preferCSSPageSize: true });

  const hojas = ruta.concat(sinLugar).map(x => path.join(carpeta, x.carpeta || '', 'auditoria.png')).filter(f => fs.existsSync(f));
  if (hojas.length) {
    const imp = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:0}*{margin:0;padding:0}img{display:block;width:210mm;height:297mm;object-fit:contain;break-after:page}</style></head><body>${hojas.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" alt="">`).join('')}</body></html>`;
    await p.setContent(imp, { waitUntil: 'load' });
    await p.pdf({ path: path.join(salida, 'imprimir.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  }
  await b.close();

  console.log(`${ruta.length} locales en ${tramos.length} ${tramos.length === 1 ? 'tramo' : 'tramos'}: unos ${distancia.toFixed(1).replace('.', ',')} km, ${duracion(minutos)} con las visitas.`);
  ruta.forEach((x, i) => console.log(`  ${i + 1}. ${x.negocio}${x.direccion ? ' (' + x.direccion + ')' : ''}`));
  if (sinLugar.length) console.log(`Sin ubicación (van al final): ${sinLugar.map(x => x.negocio).join(', ')}`);
  console.log('Para el celular: ' + path.join(salida, 'ruta.pdf') + (hojas.length ? '  ·  Para imprimir: ' + path.join(salida, 'imprimir.pdf') : ''));
})().catch(e => { console.error(e); process.exit(1); });
