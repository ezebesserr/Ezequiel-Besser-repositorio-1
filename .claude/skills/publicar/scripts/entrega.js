// Entrega de un sitio terminado: chequea lo que no puede quedar mal y arma la hoja y el mensaje para el cliente.
// Uso: node entrega.js <url final o index.html> --negocio "Nombre" [--dominio negocio.com.ar] [--vence AAAA-MM-DD]
//        [--resenas <link para dejar reseña en Google>] [--abono presencia|presencia-ia|precios|precios-grande|mantenimiento]
//        [--telefono "<WhatsApp del cliente>"] --salida <carpeta-privada>
// Deja en la salida:
//   chequeo.txt   lo que está bien y lo que hay que arreglar antes de entregar (noindex, aviso de muestra, datos a
//                 confirmar, WhatsApp sin el 9, HTTPS, recursos que no cargan, datos para Google)
//   entrega.pdf   «La web ya está publicada»: QR de la web, qué hacer esta semana, cómo pedir cambios y qué es suyo
//   entrega.png   la misma hoja, para mandar por WhatsApp
//   mensaje.txt   el mensaje de entrega (con el link de WhatsApp si pasás --telefono)
// Si encuentra algo grave, igual arma la hoja pero sale con código 2: no la mandes hasta arreglarlo.
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
    const trabajo = (/Muestra de comercio[^:]*:\s*(\S+)/.exec(md) || [])[1] || '';
    return { firma: c('Nombre para firmar'), presentacion: c('Presentación'), whatsapp: c('WhatsApp para clientes'), trabajo };
  } catch (e) { return {}; }
}
// Qué incluye cada abono, leído de precios.md (así no se repite el texto).
const ABONOS = { presencia: 'Presencia', 'presencia-ia': 'Presencia + IA', precios: 'Precios al día', 'precios-grande': 'Precios al día, grande', mantenimiento: 'Mantenimiento' };
function abono(clave) {
  if (!clave || clave === 'no') return null;
  const nombre = ABONOS[clave];
  if (!nombre) { console.error('--abono va como: ' + Object.keys(ABONOS).join(', ')); process.exit(1); }
  const md = fs.readFileSync(path.join(REPO, 'creador/negocio/precios.md'), 'utf8');
  if (clave === 'mantenimiento') {
    const m = /\*\*Mantenimiento\*\*:\s*USD\s*(\d+)\s*por mes\s*\(([^)]+)\)/.exec(md);
    return { nombre, incluye: m ? m[2].charAt(0).toUpperCase() + m[2].slice(1) + '.' : '' };
  }
  for (const l of md.split('\n')) {
    const f = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*$/.exec(l);
    if (f && f[1] === nombre) return { nombre, incluye: f[2].replace(/\s*Por mes\.\s*$/i, '').trim() };
  }
  return { nombre, incluye: '' };
}
function waNumero(tel) {
  let d = String(tel || '').replace(/\D/g, ''); if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54') && d.length >= 12) { d = d.slice(2); if (d[0] === '9') d = d.slice(1); }
  if (d[0] === '0') d = d.slice(1);
  if (d.length === 12) for (let a = 2; a <= 4; a++) if (d.substr(a, 2) === '15') { d = d.slice(0, a) + d.slice(a + 2); break; }
  if (d.length === 10 && d.startsWith('15')) d = '11' + d.slice(2);
  return d.length === 10 ? '549' + d : null;
}

async function chequear(b, objetivo) {
  const esUrl = /^https?:\/\//i.test(objetivo);
  const url = esUrl ? objetivo : 'file://' + path.resolve(objetivo);
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-AR' });
  const p = await ctx.newPage();
  const fallidas = [];
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) fallidas.push(r.url()); });
  await p.goto(url, { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(1000);
  const finalUrl = p.url();
  const d = await p.evaluate(() => {
    const meta = n => (document.querySelector(`meta[name="${n}"], meta[property="${n}"]`) || {}).content || '';
    const texto = document.body ? document.body.innerText : '';
    const negocios = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const j = JSON.parse(s.textContent);
        const todos = [].concat(j['@graph'] || j);
        todos.forEach(x => { if (x && (x.address || x.telephone)) negocios.push({ tipo: [].concat(x['@type'] || '').join(','), tel: !!x.telephone, dir: !!x.address }); });
      } catch (e) { negocios.push({ error: true }); }
    });
    const hrefs = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href') || '');
    const wa = hrefs.filter(h => /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(h)).map(h => (/(?:wa\.me\/|phone=)\+?(\d+)/.exec(h) || [])[1] || '');
    const tel = hrefs.filter(h => /^tel:/i.test(h)).map(h => h.replace(/^tel:/i, '').replace(/\D/g, ''));
    const pendientes = [...document.querySelectorAll('.pendiente')].map(e => e.textContent.trim()).filter(Boolean);
    const marcas = (texto.match(/dato a confirmar|\((?:a )?completar\)|\[(?:a )?completar\]|lorem ipsum/gi) || []);
    const aviso = (texto.match(/web de muestra|negocio inventado|datos son de ejemplo|vista previa|propuesta de nueva web/i) || [])[0] || '';
    let peso = 0; try { performance.getEntriesByType('resource').forEach(r => { peso += r.transferSize || 0; }); } catch (e) {}
    return {
      robots: meta('robots'), titulo: document.title || '', descripcion: meta('description'), ogImagen: meta('og:image'),
      negocios, wa, tel, pendientes, marcas: marcas.length, aviso, demo: !!document.querySelector('.aviso-demo, .cinta'),
      sinAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
      ancho: document.documentElement.scrollWidth, peso
    };
  });
  await ctx.close();

  const C = [], add = (grave, ok, texto) => C.push({ grave, ok, texto });
  add(true, !/noindex/i.test(d.robots), /noindex/i.test(d.robots) ? 'Tiene noindex: Google no la va a mostrar. Sacalo del <head>.' : 'Sin noindex: Google la puede mostrar.');
  add(true, !d.aviso && !d.demo, d.aviso || d.demo ? `Todavía tiene el aviso de muestra${d.aviso ? ' («' + d.aviso + '»)' : ''} o botones de demostración. Sacalos.` : 'Sin avisos de muestra.');
  const faltan = d.pendientes.length + (d.pendientes.length ? 0 : d.marcas);
  add(true, !faltan, faltan ? `Quedan ${faltan} ${faltan === 1 ? 'dato' : 'datos'} a confirmar${d.pendientes.length ? ': «' + [...new Set(d.pendientes)].slice(0, 3).join('», «') + '»' : ''}. Pedíselos al cliente o sacalos.` : 'Sin datos a confirmar.');
  const waMal = d.wa.filter(n => !/^549\d{10}$/.test(n));
  if (!d.wa.length) add(true, false, 'No tiene botón de WhatsApp.');
  else add(true, !waMal.length, waMal.length ? `WhatsApp mal cargado: ${[...new Set(waMal)].map(n => n || '(sin número)').join(', ')}. Tiene que ser 549 + característica sin 0 + número sin 15.` : `WhatsApp bien cargado (+${d.wa[0]}).`);
  const telMal = d.tel.filter(n => n.length < 10);
  if (d.tel.length) add(false, !telMal.length, telMal.length ? `Teléfono incompleto en un botón de llamar: ${telMal.join(', ')}.` : 'Botones de llamar con el número completo.');
  if (esUrl) add(true, finalUrl.startsWith('https://'), finalUrl.startsWith('https://') ? 'Abre con HTTPS.' : 'No abre con HTTPS: esperá el candado de Cloudflare o revisá el dominio.');
  else add(false, false, 'Chequeaste el archivo local: corré de nuevo con la URL final para probar HTTPS y el dominio.');
  add(true, !fallidas.length, fallidas.length ? `No cargan ${fallidas.length === 1 ? 'un recurso' : fallidas.length + ' recursos'}: ${fallidas.slice(0, 3).map(u => u.split('/').pop()).join(', ')}.` : 'Cargan todas las imágenes y archivos.');
  add(true, d.ancho <= 392, d.ancho <= 392 ? 'No se corre de costado en el celular.' : `En el celular se corre de costado (${d.ancho} px de ancho).`);
  const neg = d.negocios.filter(x => !x.error);
  add(false, neg.some(x => x.tel && x.dir), neg.some(x => x.tel && x.dir) ? `Datos para Google (JSON-LD ${neg[0].tipo || 'LocalBusiness'}) con teléfono y dirección.` : 'Faltan los datos para Google: JSON-LD LocalBusiness con teléfono y dirección (ver crear-pagina).');
  add(false, !!(d.titulo && d.descripcion), d.titulo && d.descripcion ? 'Título y descripción para Google.' : 'Falta el título o la meta description.');
  add(false, !!d.ogImagen, d.ogImagen ? 'Imagen para compartir (og:image).' : 'Falta la imagen para compartir (og:image): generala con revisar.js --og.');
  if (d.sinAlt) add(false, false, `${d.sinAlt} ${d.sinAlt === 1 ? 'imagen' : 'imágenes'} sin texto alternativo (alt).`);
  if (d.peso > 3 * 1048576) add(false, false, `Pesa ${(d.peso / 1048576).toFixed(1).replace('.', ',')} MB: achicá las imágenes.`);
  return { finalUrl, esUrl, chequeos: C };
}

(async () => {
  const o = args();
  if (!o._[0] || !o.negocio || !o.salida) {
    console.error('Uso: node entrega.js <url final o index.html> --negocio "Nombre" [--dominio negocio.com.ar] [--vence AAAA-MM-DD] [--resenas <link>] [--abono presencia] [--telefono "<WhatsApp del cliente>"] --salida <carpeta-privada>');
    process.exit(1);
  }
  const salida = path.resolve(o.salida);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La salida va fuera del repo, que es público.'); process.exit(1); }
  fs.mkdirSync(salida, { recursive: true });
  const P = perfil(), A = abono(o.abono);
  let qr;
  try { qr = require('qrcode'); } catch (e) { console.error('Falta la librería del QR: npm install -g qrcode'); process.exit(1); }

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  let r;
  try { r = await chequear(b, o._[0]); }
  catch (e) { await b.close(); console.error('No pude abrir la web: ' + e.message.split('\n')[0]); process.exit(1); }
  const graves = r.chequeos.filter(c => c.grave && !c.ok), avisos = r.chequeos.filter(c => !c.grave && !c.ok);
  const lineas = r.chequeos.map(c => (c.ok ? 'OK     ' : c.grave ? 'GRAVE  ' : 'REVISAR') + ' ' + c.texto);
  fs.writeFileSync(path.join(salida, 'chequeo.txt'), `Chequeo de entrega · ${o.negocio} · ${r.finalUrl}\n\n${lineas.join('\n')}\n`);

  // Lo que ve el cliente: su dirección real, no la del archivo local.
  const web = r.esUrl ? r.finalUrl.replace(/\/index\.html$/, '/') : (o.dominio ? 'https://' + o.dominio.replace(/^https?:\/\//, '') + '/' : r.finalUrl);
  const visible = (o.dominio || web).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const svg = (t, color) => qr.toString(t, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: color, light: '#ffffff' } });
  const qrWeb = await svg(web, '#182019'), qrResenas = o.resenas ? await svg(o.resenas, '#182019') : '';
  const fecha = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  const vence = o.vence ? new Date(o.vence + 'T12:00:00Z').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  const contacto = P.whatsapp ? `por WhatsApp al ${esc(P.whatsapp)}` : 'por WhatsApp <span class="pendiente">(tu WhatsApp para clientes, en perfil.md)</span>';
  const linkPresencia = P.trabajo && /\/muestras\//.test(P.trabajo) ? P.trabajo.replace(/muestras\/[^/]+\/?$/, 'muestras/presencia/') : '';

  const hoja = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Entrega · ${esc(o.negocio)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Chivo+Mono:wght@400;600&family=Chivo:wght@800;900&display=swap">
<style>
  :root{--tinta:#182019;--gris:#4f5a52;--linea:#d3d9d4;--birome:#2342ac;--fondo:#eef0ee}
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:794px;min-height:1123px;background:#fff;color:var(--tinta);font:16px/1.45 "Alegreya Sans",system-ui,sans-serif;padding:44px 48px}
  .eti{font:600 12px/1.2 "Chivo Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--gris)}
  h1{font:900 36px/1.05 "Chivo",sans-serif;margin-top:6px;max-width:620px}
  .grid{display:grid;grid-template-columns:250px 1fr;gap:34px;margin-top:28px;align-items:start}
  .qr{border:2px solid var(--tinta);padding:14px;text-align:center}
  .qr svg{display:block;width:100%;height:auto}
  .qr b{display:block;font:600 14px "Chivo Mono",monospace;margin-top:10px;word-break:break-all}
  .qr small{display:block;color:var(--gris);font-size:13px;margin-top:2px}
  .qr + .qr{margin-top:18px}
  h2{font:800 19px/1.2 "Chivo",sans-serif;margin:0 0 8px}
  section + section{margin-top:22px}
  ol{padding-left:20px;display:grid;gap:8px}
  li::marker{font-weight:700}
  p + p{margin-top:6px}
  .pendiente{background:#fff3b0;padding:0 3px}
  .firma{margin-top:30px;padding-top:12px;border-top:2px solid var(--tinta);font-size:15px;color:var(--gris)}
</style></head><body>
<p class="eti">Entrega · ${esc(fecha)}</p>
<h1>La web de ${esc(o.negocio)} ya está publicada</h1>
<div class="grid">
  <div>
    <div class="qr">${qrWeb}<b>${esc(visible)}</b><small>Escaneen para abrirla</small></div>
    ${qrResenas ? `<div class="qr">${qrResenas}<b>Reseñas en Google</b><small>Para que sus clientes les dejen una</small></div>` : ''}
  </div>
  <div>
    <section><h2>Esta semana</h2><ol>
      <li><b>Google Maps:</b> editen su ficha de Google y peguen el link de la web en «Sitio web».</li>
      <li><b>Instagram y WhatsApp Business:</b> el mismo link en la bio de Instagram y en el perfil de WhatsApp.</li>
      <li><b>Reseñas:</b> ${qrResenas ? 'muestren el QR de reseñas a sus clientes de confianza y pídanles que cuenten cómo los atendieron.' : 'pidan a sus clientes de confianza que les dejen una reseña en Google contando cómo los atendieron.'}</li>
    </ol></section>
    <section><h2>Para pedir cambios</h2>
      <p>Escríbanme ${contacto} con lo que quieran cambiar y, si pueden, una captura de la parte de la página.</p>
      <p>${A ? `Su abono <b>${esc(A.nombre)}</b> incluye: ${esc(A.incluye.charAt(0).toLowerCase() + A.incluye.slice(1))}` : 'Los cambios después de la entrega se cotizan aparte. Si quieren que me ocupe todos los meses, pregúntenme por el mantenimiento.'}</p>
    </section>
    <section><h2>Lo que es de ustedes</h2>
      ${o.dominio ? `<p>El dominio <b>${esc(o.dominio)}</b> está a su nombre en NIC Argentina. ${vence ? `Vence el <b>${esc(vence)}</b>: renuévenlo en nic.ar antes de esa fecha.` : 'Se renueva una vez por año en nic.ar: anoten la fecha de vencimiento.'}</p>` : `<p>La web está en <b>${esc(visible)}</b>. Si quieren un dominio propio (.com.ar), se registra a su nombre en NIC Argentina.</p>`}
    </section>
  </div>
</div>
<p class="firma">${esc(P.firma || '')}${P.presentacion ? ' · ' + esc(P.presentacion) : ''}${P.whatsapp ? ' · WhatsApp ' + esc(P.whatsapp) : ''}</p>
</body></html>`;
  fs.writeFileSync(path.join(salida, 'entrega.html'), hoja);
  const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(salida, 'entrega.html'), { waitUntil: 'load' }); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(salida, 'entrega.png'), fullPage: true });
  await p.pdf({ path: path.join(salida, 'entrega.pdf'), format: 'A4', printBackground: true });
  await b.close();

  const mensaje = `¡Ya está publicada la web de ${o.negocio}! ${web}\n\nLes mando una hoja con el QR y tres cosas para hacer esta semana: poner el link en la ficha de Google Maps, en Instagram y en el WhatsApp Business, y pedir reseñas a sus clientes.\n\n` +
    (A ? `Desde este mes queda andando el abono ${A.nombre}. Cualquier cambio que necesiten, me escriben por acá.` :
      `Para que los encuentren más, el paso que sigue es la ficha de Google y las reseñas. Con el abono Presencia nos ocupamos todos los meses y les mando un informe con cuántos clientes llegaron desde Google${linkPresencia ? ', como este: ' + linkPresencia : ''}. ¿Lo vemos?`) +
    '\n\n¡Gracias por la confianza!';
  fs.writeFileSync(path.join(salida, 'mensaje.txt'), mensaje + '\n');

  console.log(lineas.join('\n'));
  if (!P.whatsapp) console.log('\nOjo: falta tu WhatsApp para clientes en creador/negocio/perfil.md; la hoja lo marca como pendiente.');
  const n = o.telefono ? waNumero(o.telefono) : null;
  if (n) console.log('\nMandar: https://wa.me/' + n + '?text=' + encodeURIComponent(mensaje));
  else if (o.telefono) console.log('\nNo entiendo el número ' + o.telefono + ': copiá el mensaje de mensaje.txt.');
  console.log(`\nArchivos: ${['entrega.pdf', 'entrega.png', 'mensaje.txt', 'chequeo.txt'].map(x => path.join(salida, x)).join(', ')}`);
  if (graves.length) { console.log(`\nNO LA ENTREGUES TODAVÍA: ${graves.length} ${graves.length === 1 ? 'cosa grave' : 'cosas graves'} para arreglar.`); process.exit(2); }
  console.log(avisos.length ? `\nLista para entregar, con ${avisos.length} ${avisos.length === 1 ? 'detalle' : 'detalles'} para revisar.` : '\nLista para entregar.');
})().catch(e => { console.error(e); process.exit(1); });
