// Auditoría de la web de un negocio en un comando, para mandar con el primer mensaje.
// Saca cómo la ve un cliente desde el celular, busca problemas concretos y comprobables, y deja:
//   auditoria.png   la hoja para mandar por WhatsApp (captura del celular + lo que encontramos)
//   auditoria.pdf   la misma hoja en A4
//   auditoria.json  los hallazgos, para cargar el contacto en el Mostrador
//   observacion.txt la frase para el primer mensaje («Entré a la web de X y vi que …»)
//
// Uso: node auditoria.js <url o archivo> --negocio "Nombre" [--muestra <link a un trabajo nuestro>] --salida <carpeta>
// Baja solo la portada, una vez. La salida va fuera del repo (es material de prospección).
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');

function args() {
  const a = process.argv.slice(2), o = { _: [] };
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1]; i++; } else o._.push(a[i]); }
  return o;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function perfil() {
  try {
    const md = fs.readFileSync(path.join(REPO, 'creador/negocio/perfil.md'), 'utf8');
    const c = n => { const m = new RegExp('\\*\\*' + n + '\\*\\*:\\s*(.+)').exec(md); const v = m ? m[1].trim() : ''; return /completar/i.test(v) ? '' : v.replace(/\s*\(si firman.*$/i, ''); };
    const trabajo = (/Muestra de comercio[^:]*:\s*(\S+)/.exec(md) || [])[1] || '';
    return { firma: c('Nombre para firmar'), presentacion: c('Presentación'), whatsapp: c('WhatsApp para clientes'), trabajo };
  } catch (e) { return {}; }
}

(async () => {
  const o = args();
  const objetivo = o._[0];
  if (!objetivo || !o.negocio || !o.salida) { console.error('Uso: node auditoria.js <url o archivo> --negocio "Nombre" [--muestra <link>] --salida <carpeta>'); process.exit(1); }
  const salida = path.resolve(o.salida);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La salida va fuera del repo, que es público.'); process.exit(1); }
  const esUrl = /^https?:\/\//i.test(objetivo);
  const url = esUrl ? objetivo : 'file://' + path.resolve(objetivo);
  const anio = new Date().getFullYear();
  const P = perfil();
  const muestra = o.muestra || P.trabajo || '';

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  fs.mkdirSync(salida, { recursive: true });

  // Celular
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-AR', deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const fallidas = [], errores = [];
  p.on('requestfailed', r => fallidas.push(r.url()));
  p.on('pageerror', e => errores.push(String(e)));
  let respuesta = null;
  try { respuesta = await p.goto(url, { waitUntil: 'load', timeout: 45000 }); }
  catch (e) { console.error('No pude abrir ' + url + ': ' + e.message.split('\n')[0]); await b.close(); process.exit(1); }
  await p.waitForTimeout(1500);
  const finalUrl = p.url();
  const d = await p.evaluate((anio) => {
    const html = document.documentElement.outerHTML;
    const texto = document.body ? document.body.innerText : '';
    const vp = document.querySelector('meta[name="viewport"]');
    const flash = !!document.querySelector('embed[src*=".swf" i], object[data*=".swf" i], embed[type*="flash" i], object[type*="flash" i], param[value*=".swf" i]') || /\.swf\b|shockwave-flash/i.test(html);
    const frames = document.querySelectorAll('frameset, frame').length;
    const tablas = document.querySelectorAll('table').length, fonts = document.querySelectorAll('font, center, marquee').length;
    const anios = []; const re = /(?:©|&copy;|copyright|\(c\))\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi; let m;
    while ((m = re.exec(texto))) anios.push(Number(m[1]));
    const links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href') || '');
    const wa = links.filter(h => /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(h));
    const waMal = wa.filter(h => { const n = (/(?:wa\.me\/|phone=)(\d+)/.exec(h) || [])[1]; return n && n.startsWith('54') && !n.startsWith('549'); });
    // Tamaño real de la letra en la pantalla del celular
    const escala = 390 / window.innerWidth;
    const tam = [...document.querySelectorAll('p, li, td, span, a, div, font')].filter(e => e.childElementCount === 0 && (e.textContent || '').trim().length > 20)
      .slice(0, 300).map(e => parseFloat(getComputedStyle(e).fontSize) * escala).sort((a, b) => a - b);
    const mediana = tam.length ? tam[Math.floor(tam.length / 2)] : null;
    let peso = 0; try { performance.getEntriesByType('resource').forEach(r => { peso += r.transferSize || 0; }); peso += (performance.getEntriesByType('navigation')[0] || {}).transferSize || 0; } catch (e) {}
    return { titulo: document.title || '', viewport: !!vp, ancho: window.innerWidth, scroll: document.documentElement.scrollWidth, flash, frames, tablas, fonts,
      anioCopy: anios.length ? Math.max(...anios) : null, wa: wa.length, waMal: waMal.length, letra: mediana, peso, tel: links.filter(h => h.startsWith('tel:')).length };
  }, anio);
  await p.screenshot({ path: path.join(salida, 'celular.png'), clip: { x: 0, y: 0, width: 390, height: 844 } });
  await ctx.close();

  // Hallazgos, del más grave al más leve. Cada uno con su frase para el primer mensaje.
  const H = [];
  const add = (grav, titulo, explica, frase) => H.push({ grav, titulo, explica, frase });
  if (d.flash) add(3, 'Usa Flash', 'Los navegadores dejaron de mostrar Flash en 2021: esa parte sale en blanco para todos.', 'usa Flash, que los navegadores dejaron de mostrar, así que esa parte de la página sale en blanco');
  if (!d.viewport || d.ancho > 420) add(3, 'No está adaptada al celular', 'En el teléfono se ve la versión de computadora en miniatura y hay que hacer zoom para leer.', 'en el celular se ve en miniatura, porque no está adaptada');
  else if (d.scroll > 400) add(2, 'Se corre de costado en el celular', 'Hay partes más anchas que la pantalla: el cliente tiene que deslizar para los costados.', 'en el celular la página se corre de costado');
  if (d.waMal) add(3, 'El botón de WhatsApp no funciona bien', 'El número está cargado sin el 9 después del 54, y así WhatsApp no encuentra la cuenta.', 'el botón de WhatsApp tiene el número sin el 9, así que WhatsApp no lo encuentra');
  if (esUrl && finalUrl.startsWith('http://')) add(2, 'Sin conexión segura (HTTPS)', 'Chrome la marca como «No seguro» al lado de la dirección, y eso espanta clientes.', 'el navegador la marca como «No seguro» porque no tiene HTTPS');
  if (d.letra && d.letra < 11) add(2, 'Letra muy chica en el celular', `El texto se ve de unos ${Math.round(d.letra)} píxeles: ilegible sin hacer zoom.`, 'en el celular la letra queda tan chica que no se puede leer sin hacer zoom');
  if (!d.wa) add(2, 'No hay botón de WhatsApp', 'Desde el celular no hay forma de escribirles con un toque, que es como hoy consulta la mayoría.', 'no tiene un botón para escribirles por WhatsApp desde el celular');
  if (fallidas.length) add(2, fallidas.length === 1 ? 'Hay una parte que no carga' : `Hay ${fallidas.length} partes que no cargan`, 'Imágenes o archivos que la página pide y no aparecen.', 'hay partes de la página que no cargan');
  if (d.frames) add(2, 'Hecha con frames', 'Una técnica de fines de los noventa: Google la indexa mal y en el celular no se puede usar.', 'está hecha con frames, una técnica de los noventa que en el celular no anda');
  if (d.anioCopy && d.anioCopy <= anio - 4) add(1, `El pie dice © ${d.anioCopy}`, 'Le da al cliente la sensación de que nadie la actualiza hace años.', `el pie de la página dice © ${d.anioCopy}`);
  if (d.peso > 3 * 1024 * 1024) add(1, `Pesa ${(d.peso / 1048576).toFixed(1).replace('.', ',')} MB`, 'Con datos móviles tarda en abrir, y mucha gente se va antes.', 'tarda mucho en abrir con datos móviles');
  if (d.tablas > 3 && d.fonts > 3) add(1, 'Armada como en los 2000', 'Tablas y etiquetas de formato viejas: es difícil de mantener y de adaptar.', 'está armada como en los 2000, con tablas');
  H.sort((a, b) => b.grav - a.grav);

  const sinProblemas = H.length === 0;
  const observacion = sinProblemas ? '' : H[0].frase + (H[1] && H[1].grav >= 2 ? '. Además, ' + H[1].frase : '');
  const grav = ['', 'leve', 'importante', 'grave'];
  const img = 'data:image/png;base64,' + fs.readFileSync(path.join(salida, 'celular.png')).toString('base64');
  const hoja = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Auditoría · ${esc(o.negocio)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Chivo+Mono:wght@400;600&family=Chivo:wght@800;900&display=swap">
<style>
  :root{--tinta:#182019;--gris:#4f5a52;--linea:#d3d9d4;--birome:#2342ac;--grave:#b42318;--media:#9a5b00;--leve:#4f5a52;--fondo:#eef0ee}
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:794px;min-height:1123px;background:#fff;color:var(--tinta);font:16px/1.45 "Alegreya Sans",system-ui,sans-serif;padding:40px 44px}
  .eti{font:600 12px/1.2 "Chivo Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--gris)}
  h1{font:900 34px/1.05 "Chivo",sans-serif;margin-top:6px}
  .url{font:13px "Chivo Mono",monospace;color:var(--gris);margin-top:6px;word-break:break-all}
  .grid{display:grid;grid-template-columns:300px 1fr;gap:30px;margin-top:24px;align-items:start}
  .tel{border:12px solid #1d2420;border-radius:34px;overflow:hidden;background:#1d2420;box-shadow:0 18px 40px -20px rgba(0,0,0,.5)}
  .tel img{display:block;width:100%}
  .tel-pie{text-align:center;font:12px "Chivo Mono",monospace;color:var(--gris);margin-top:8px}
  h2{font:800 20px/1.2 "Chivo",sans-serif;margin-bottom:10px}
  ol{list-style:none;display:grid;gap:12px}
  li{border-left:4px solid var(--leve);padding:2px 0 2px 12px}
  li.g3{border-color:var(--grave)} li.g2{border-color:var(--media)}
  li b{display:block;font-size:17px}
  li span{color:var(--gris);font-size:15px}
  li small{font:600 10.5px "Chivo Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:var(--gris)}
  .bien{color:var(--gris)}
  .arreglo{margin-top:22px;padding:14px 16px;background:var(--fondo);border-left:4px solid var(--birome)}
  .arreglo b{display:block;font:800 17px "Chivo",sans-serif;margin-bottom:4px}
  .firma{margin-top:22px;font-size:15px;color:var(--gris)}
</style></head><body>
<p class="eti">Auditoría rápida de la web · ${new Date().toLocaleDateString('es-AR')}</p>
<h1>Así ve la web de ${esc(o.negocio)} un cliente desde el celular</h1>
<p class="url">${esc(finalUrl)}</p>
<div class="grid">
  <div><div class="tel"><img src="${img}" alt="Captura de la portada en un celular"></div><p class="tel-pie">Primera pantalla, en un celular de 390 px</p></div>
  <div>
    <h2>${sinProblemas ? 'No encontré problemas graves' : 'Lo que encontramos'}</h2>
    ${sinProblemas ? '<p class="bien">La portada se ve bien en el celular y no tiene errores a la vista.</p>' : `<ol>${H.slice(0, 6).map(h => `<li class="g${h.grav}"><small>${grav[h.grav]}</small><b>${esc(h.titulo)}</b><span>${esc(h.explica)}</span></li>`).join('')}</ol>`}
    <div class="arreglo"><b>Cómo se arregla</b>Una web nueva, pensada primero para el celular, con WhatsApp a un toque y sus datos reales. Les armo una muestra sin cargo para que la vean antes de decidir.${muestra ? `<br>Un trabajo nuestro: ${esc(muestra)}` : ''}</div>
    <p class="firma">${esc(P.firma || '')}${P.presentacion ? ' · ' + esc(P.presentacion) : ''}${P.whatsapp ? ' · WhatsApp ' + esc(P.whatsapp) : ''}</p>
  </div>
</div></body></html>`;
  const hojaPath = path.join(salida, 'auditoria.html');
  fs.writeFileSync(hojaPath, hoja);
  const p2 = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await p2.goto('file://' + hojaPath, { waitUntil: 'load' }); await p2.waitForTimeout(800);
  await p2.screenshot({ path: path.join(salida, 'auditoria.png'), fullPage: true });
  await p2.pdf({ path: path.join(salida, 'auditoria.pdf'), format: 'A4', printBackground: true });
  await b.close();

  fs.writeFileSync(path.join(salida, 'auditoria.json'), JSON.stringify({ negocio: o.negocio, url: finalUrl, fecha: new Date().toISOString().slice(0, 10), observacion, hallazgos: H, datos: d, fallidas: fallidas.slice(0, 20), errores: errores.slice(0, 10) }, null, 2));
  fs.writeFileSync(path.join(salida, 'observacion.txt'), (observacion || '') + '\n');
  console.log(sinProblemas ? `${o.negocio}: no encontré problemas graves. No es buen prospecto para una web nueva; quizás sí para Presencia.` : `${o.negocio}: ${H.length} hallazgos. Para el mensaje: «Entré a la web de ${o.negocio} y vi que ${observacion}.»`);
  console.log('Archivos: ' + ['auditoria.png', 'auditoria.pdf', 'auditoria.json', 'observacion.txt'].map(x => path.join(salida, x)).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
