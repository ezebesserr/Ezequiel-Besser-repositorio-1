// Auditoría de la web de un negocio (o de una lista entera), para mandar con el primer mensaje.
// Saca cómo la ve un cliente desde el celular, busca problemas concretos y comprobables, y deja por negocio:
//   auditoria.png   la hoja para mandar por WhatsApp (captura del celular + lo que encontramos)
//   auditoria.pdf   la misma hoja en A4
//   auditoria.json  los hallazgos
//   observacion.txt la frase para el primer mensaje («Entré a la web de X y vi que …»)
//
// Uno:   node auditoria.js <url o archivo> --negocio "Nombre" [--muestra <link>] --salida <carpeta>
// Lista: node auditoria.js --lote preseleccion.json [--zonas zonas.json] [--muestra <link>] --salida <carpeta>
//        (la salida de shortlist.py y geo.py de esta skill). Deja además mostrador.tsv para pegar en el
//        Mostrador («Cargar muchos de una vez»), mostrador.json (los mismos contactos, para que Claude los cargue),
//        resumen.html con todos los hallazgos y lote.json (lo usa ruta.js para el recorrido a pie).
// Baja solo la portada de cada sitio, una vez. La salida va fuera del repo (es material de prospección).
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');

function args() {
  const a = process.argv.slice(2), o = { _: [] };
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1]; i++; } else o._.push(a[i]); }
  return o;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function slug(s) { return String(s || 'negocio').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'negocio'; }
function perfil() {
  try {
    const md = fs.readFileSync(path.join(REPO, 'creador/negocio/perfil.md'), 'utf8');
    const c = n => { const m = new RegExp('\\*\\*' + n + '\\*\\*:\\s*(.+)').exec(md); const v = m ? m[1].trim() : ''; return /completar/i.test(v) ? '' : v.replace(/\s*\(si firman.*$/i, ''); };
    const trabajo = (/Muestra de comercio[^:]*:\s*(\S+)/.exec(md) || [])[1] || '';
    return { firma: c('Nombre para firmar'), presentacion: c('Presentación'), whatsapp: c('WhatsApp para clientes'), trabajo };
  } catch (e) { return {}; }
}

async function auditar(b, objetivo, negocio, muestra, salida, P) {
  const esUrl = /^https?:\/\//i.test(objetivo);
  const url = esUrl ? objetivo : 'file://' + path.resolve(objetivo);
  const anio = new Date().getFullYear();
  fs.mkdirSync(salida, { recursive: true });

  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-AR', deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const fallidas = [], errores = [];
  // Solo cuentan las partes que ve el visitante: los contadores y la publicidad no, y en una red que solo deja salir
  // https (como la de las sesiones en la nube), lo que va por http tampoco, porque desde acá no se puede saber.
  const RASTREO = /google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|googleadservices|google\.com\/(?:ccm|rmkt|pagead)|connect\.facebook\.net|facebook\.com\/tr|hotjar|clarity\.ms|tiktok\.com|pinimg|bat\.bing/i;
  const SOLO_HTTPS = !!(process.env.HTTPS_PROXY || process.env.https_proxy) && !(process.env.HTTP_PROXY || process.env.http_proxy);
  p.on('requestfailed', r => {
    const u = r.url(), t = (r.failure() || {}).errorText || '';
    if (RASTREO.test(u) || /ERR_ABORTED/.test(t) || (SOLO_HTTPS && /^http:/i.test(u))) return;
    fallidas.push(u);
  });
  let porHttps = false;
  p.on('pageerror', e => errores.push(String(e)));
  try { await p.goto(url, { waitUntil: 'load', timeout: 45000 }); }
  catch (e) {
    // Algunas redes (como la de las sesiones en la nube) solo dejan salir https: antes de darla por caída, probamos con https.
    let ok = false;
    if (/^http:\/\//i.test(url)) { try { fallidas.length = 0; await p.goto(url.replace(/^http:/i, 'https:'), { waitUntil: 'load', timeout: 45000 }); ok = true; porHttps = true; } catch (e2) {} }
    if (!ok) { await ctx.close(); return { negocio, url, error: 'no abre: ' + e.message.split('\n')[0] }; }
  }
  await p.waitForTimeout(1500);
  const finalUrl = p.url();
  const d = await p.evaluate(() => {
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
    // Uruguay: el 0 de la característica no va después del 598 (598 099… no existe para WhatsApp).
    const waCero = wa.filter(h => { const n = (/(?:wa\.me\/|phone=)(\d+)/.exec(h) || [])[1]; return n && n.startsWith('5980'); });
    const escala = 390 / window.innerWidth;
    const tam = [...document.querySelectorAll('p, li, td, span, a, div, font')].filter(e => e.childElementCount === 0 && (e.textContent || '').trim().length > 20)
      .slice(0, 300).map(e => parseFloat(getComputedStyle(e).fontSize) * escala).sort((a, b) => a - b);
    const mediana = tam.length ? tam[Math.floor(tam.length / 2)] : null;
    let peso = 0; try { performance.getEntriesByType('resource').forEach(r => { peso += r.transferSize || 0; }); peso += (performance.getEntriesByType('navigation')[0] || {}).transferSize || 0; } catch (e) {}
    const waNum = (wa.map(h => (/(?:wa\.me\/|phone=)(\d+)/.exec(h) || [])[1]).filter(Boolean)[0]) || '';
    const tel = (links.find(h => h.startsWith('tel:')) || '').replace(/^tel:/, '');
    return { titulo: document.title || '', viewport: !!vp, ancho: window.innerWidth, scroll: document.documentElement.scrollWidth, flash, frames, tablas, fonts,
      anioCopy: anios.length ? Math.max(...anios) : null, wa: wa.length, waMal: waMal.length, waCero: waCero.length, waNum, tel, letra: mediana, peso };
  });
  await p.screenshot({ path: path.join(salida, 'celular.png'), clip: { x: 0, y: 0, width: 390, height: 844 } });
  await ctx.close();

  const H = [];
  const add = (grav, titulo, explica, frase) => H.push({ grav, titulo, explica, frase });
  if (d.flash) add(3, 'Usa Flash', 'Los navegadores dejaron de mostrar Flash en 2021: esa parte sale en blanco para todos.', 'usa Flash, que los navegadores dejaron de mostrar, así que esa parte de la página sale en blanco');
  if (!d.viewport || d.ancho > 420) add(3, 'No está adaptada al celular', 'En el teléfono se ve la versión de computadora en miniatura y hay que hacer zoom para leer.', 'en el celular se ve en miniatura, porque no está adaptada');
  else if (d.scroll > 400) add(2, 'Se corre de costado en el celular', 'Hay partes más anchas que la pantalla: el cliente tiene que deslizar para los costados.', 'en el celular la página se corre de costado');
  if (d.waMal) add(3, 'El botón de WhatsApp no funciona bien', 'El número está cargado sin el 9 después del 54, y así WhatsApp no encuentra la cuenta.', 'el botón de WhatsApp tiene el número sin el 9, así que WhatsApp no lo encuentra');
  if (d.waCero) add(3, 'El botón de WhatsApp no funciona bien', 'El número tiene un 0 de más después del código de país (598), y así WhatsApp no encuentra la cuenta.', 'el botón de WhatsApp tiene el número con un 0 de más después del 598, así que WhatsApp no lo encuentra');
  if (esUrl && finalUrl.startsWith('http://')) add(2, 'Sin conexión segura (HTTPS)', 'Chrome la marca como «No seguro» al lado de la dirección, y eso espanta clientes.', 'el navegador la marca como «No seguro» porque no tiene HTTPS');
  if (d.letra && d.letra < 11) add(2, 'Letra muy chica en el celular', `El texto se ve de unos ${Math.round(d.letra)} píxeles: ilegible sin hacer zoom.`, 'en el celular la letra queda tan chica que no se puede leer sin hacer zoom');
  if (!d.wa) add(2, 'No hay botón de WhatsApp', 'Desde el celular no hay forma de escribirles con un toque, que es como hoy consulta la mayoría.', 'no tiene un botón para escribirles por WhatsApp desde el celular');
  if (porHttps) fallidas.length = 0; // abrió recién con https: lo que falle puede ser de esa versión y no de la que ve la gente
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
  const hoja = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Auditoría · ${esc(negocio)}</title>
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
<h1>Así ve la web de ${esc(negocio)} un cliente desde el celular</h1>
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
  await p2.close();

  const res = { negocio, url: finalUrl, fecha: new Date().toISOString().slice(0, 10), observacion, hallazgos: H, datos: d, fallidas: fallidas.slice(0, 20), errores: errores.slice(0, 10) };
  fs.writeFileSync(path.join(salida, 'auditoria.json'), JSON.stringify(res, null, 2));
  fs.writeFileSync(path.join(salida, 'observacion.txt'), (observacion || '') + '\n');
  return res;
}

(async () => {
  const o = args();
  if (!o.salida || (!o.lote && (!o._[0] || !o.negocio))) {
    console.error('Uno:   node auditoria.js <url o archivo> --negocio "Nombre" [--muestra <link>] --salida <carpeta>');
    console.error('Lista: node auditoria.js --lote preseleccion.json [--zonas zonas.json] [--muestra <link>] --salida <carpeta>');
    process.exit(1);
  }
  const salida = path.resolve(o.salida);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La salida va fuera del repo, que es público.'); process.exit(1); }
  const P = perfil();
  const muestra = o.muestra || P.trabajo || '';
  const { chromium } = require('playwright');
  const b = await chromium.launch();

  if (!o.lote) {
    const r = await auditar(b, o._[0], o.negocio, muestra, salida, P);
    await b.close();
    if (r.error) { console.error(`${o.negocio}: ${r.error}`); process.exit(1); }
    console.log(r.observacion ? `${o.negocio}: ${r.hallazgos.length} hallazgos. Para el mensaje: «Entré a la web de ${o.negocio} y vi que ${r.observacion}.»` : `${o.negocio}: no encontré problemas graves. No es buen prospecto para una web nueva; quizás sí para Presencia.`);
    console.log('Archivos: ' + ['auditoria.png', 'auditoria.pdf', 'auditoria.json', 'observacion.txt'].map(x => path.join(salida, x)).join(', '));
    return;
  }

  const lista = JSON.parse(fs.readFileSync(o.lote, 'utf8'));
  const zonas = o.zonas ? JSON.parse(fs.readFileSync(o.zonas, 'utf8')) : {};
  const filas = [], resumen = [];
  for (let i = 0; i < lista.length; i++) {
    const n = lista[i], negocio = n.name || n.nombre || n.negocio || `Negocio ${i + 1}`, url = n.final || n.web || n.url; // final: la dirección a la que llegó scan.py
    if (!url) continue;
    const carpeta = path.join(salida, String(i + 1).padStart(2, '0') + '-' + slug(negocio));
    process.stdout.write(`${i + 1}/${lista.length} ${negocio}… `);
    const r = await auditar(b, url, negocio, muestra, carpeta, P);
    const z = zonas[i] || zonas[String(i)] || {};
    const graves = (r.hallazgos || []).filter(h => h.grav >= 2).length;
    const linea = r.error ? '' : (graves ? 'web' : 'presencia');
    const tel = n.phone || n.telefono || (r.datos && r.datos.waNum ? '+' + r.datos.waNum : '') || (r.datos && r.datos.tel) || '';
    console.log(r.error ? r.error : `${(r.hallazgos || []).length} hallazgos`);
    const direccion = [[n.street, n.num].filter(Boolean).join(' '), n.city].filter(Boolean).join(', ') || n.direccion || '';
    const lat = z.lat != null ? z.lat : (n.loc ? n.loc[0] : n.lat), lon = z.lon != null ? z.lon : (n.loc ? n.loc[1] : n.lon);
    resumen.push({ i: i + 1, negocio, url, zona: z.zona || n.zona || '', rubro: n.rubro || n.cat || '', tel, email: n.email || '', direccion, lat, lon, r, carpeta, linea });
    if (!r.error) filas.push([negocio, n.rubro || n.cat || '', z.zona || n.zona || '', tel, r.observacion || 'su web se ve bien en el celular: ofrecerle Presencia en Google', linea].map(x => String(x).replace(/[\t\n]/g, ' ')).join('\t'));
  }
  await b.close();
  fs.writeFileSync(path.join(salida, 'mostrador.tsv'), filas.join('\n') + '\n');
  // Los mismos contactos como documentos del Mostrador (contactos/<id>), para que Claude los cargue con ArtifactData batch.
  const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }), ahora = new Date().toISOString();
  const docs = resumen.filter(x => !x.r.error).map(x => ({ id: slug(x.negocio), doc: {
    negocio: x.negocio, rubro: x.rubro, zona: x.zona, etapa: 'prospecto', linea: x.linea, telefono: x.tel, email: x.email, web: x.url,
    observacion: x.r.observacion || '', muestra_url: '', detalle: '', presupuesto_usd: 0, abono_usd: 0,
    proximo: x.linea === 'web' ? 'Mandar el primer mensaje con la hoja de la auditoría' : 'Ofrecerle Presencia (su web está bien)', fecha_proximo: hoy,
    notas: 'Auditoría: ' + path.join(x.carpeta, 'auditoria.png'), historial: [{ f: hoy, t: 'Auditada y cargada como prospecto' }], creado: ahora, actualizado: ahora } }));
  fs.writeFileSync(path.join(salida, 'mostrador.json'), JSON.stringify(docs, null, 2));
  // Todo junto, para ruta.js (el recorrido a pie) y para volver a mirar el lote sin auditar de nuevo.
  fs.writeFileSync(path.join(salida, 'lote.json'), JSON.stringify(resumen.map(x => ({ i: x.i, negocio: x.negocio, rubro: x.rubro, zona: x.zona,
    direccion: x.direccion, lat: x.lat == null ? null : Number(x.lat), lon: x.lon == null ? null : Number(x.lon), telefono: x.tel, email: x.email, web: x.url,
    linea: x.linea, observacion: x.r.observacion || '', error: x.r.error || '', carpeta: path.relative(salida, x.carpeta) })), null, 2));
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Auditorías</title>
<style>body{margin:0;background:#eef0ee;color:#182019;font:16px/1.45 system-ui,sans-serif}.w{max-width:980px;margin:0 auto;padding:20px 16px}
h1{font-size:1.6rem;margin:0 0 6px}.c{background:#fff;border:1px solid #d3d9d4;border-radius:3px;padding:12px 14px;margin:10px 0;display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px}
.c img{width:96px;border-radius:10px;border:1px solid #d3d9d4}.c p{overflow-wrap:anywhere}.c h2{font-size:1.1rem;margin:0}.c p{margin:4px 0}.g{color:#b42318;font-weight:600}.m{font:13px ui-monospace,monospace;color:#4f5a52;word-break:break-all}</style></head><body><main class="w">
<h1>Auditorías (${resumen.length})</h1><p>Los que dicen «web» van con el mensaje de web nueva; los que dicen «presencia», con el de la ficha de Google. Para cargarlos todos: copiá <code>mostrador.tsv</code> y pegalo en el Mostrador → Ajustes → «Cargar muchos de una vez».</p>
${resumen.map(x => `<section class="c">${x.r.error ? '<span></span>' : `<img src="${esc(path.relative(salida, path.join(x.carpeta, 'celular.png')))}" alt="">`}<div><h2>${x.i}. ${esc(x.negocio)} <small>${esc(x.linea || '')}</small></h2><p class="m">${esc(x.url)} · ${esc(x.rubro)} ${esc(x.zona)} ${esc(x.tel)}</p>${x.r.error ? `<p class="g">No abrió desde acá (${esc((/net::(\w+)|Timeout/.exec(x.r.error) || ['error'])[0])}).</p><p>Probala vos desde el celular. Si tampoco abre, es un buen prospecto: cargalo a mano con «la dirección de su web no abre».</p>` : `<p>${x.r.observacion ? '«…vi que ' + esc(x.r.observacion) + '.»' : 'Sin problemas graves.'}</p><p class="m">Hoja: ${esc(path.relative(salida, path.join(x.carpeta, 'auditoria.png')))}</p>`}</div></section>`).join('\n')}
</main></body></html>`;
  fs.writeFileSync(path.join(salida, 'resumen.html'), html);
  const ok = resumen.filter(x => !x.r.error);
  console.log(`\n${ok.length} auditados (${ok.filter(x => x.linea === 'web').length} para web nueva, ${ok.filter(x => x.linea === 'presencia').length} para Presencia), ${resumen.length - ok.length} no abrieron.`);
  console.log('Para el Mostrador: ' + path.join(salida, 'mostrador.tsv') + ' (o mostrador.json)  ·  Resumen: ' + path.join(salida, 'resumen.html'));
})().catch(e => { console.error(e); process.exit(1); });
