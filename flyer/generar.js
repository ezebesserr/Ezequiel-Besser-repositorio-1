// Genera el flyer listo para imprimir y para mandar por WhatsApp, desde flyer/index.html:
//   flyer.pdf (A4, para imprimir; el WhatsApp y el mail se pueden tocar), flyer.png (para mandar por WhatsApp)
//   y og.jpg (1200×630, la vista previa cuando se comparte el link de la página).
// Antes de sacarlos, vuelve a armar el QR del rótulo con el número de WHATSAPP de acá abajo.
//
// Uso: node flyer/generar.js
// Necesita la librería qrcode (npm install -g qrcode) y Playwright con Chromium.
const fs = require('fs');
const path = require('path');

const WHATSAPP = '5491165877147';
const MENSAJE = 'Hola Ezequiel, vi tu flyer y quiero consultarte por mi comercio.';

const DIR = __dirname;
const HTML = path.join(DIR, 'index.html');

(async () => {
  let QR;
  try { QR = require('qrcode'); } catch (e) { console.error('Falta la librería qrcode. Instalala con: npm install -g qrcode'); process.exit(1); }
  const link = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAJE)}`;
  const svg = (await QR.toString(link, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#11151c', light: '#ffffff' } }))
    .replace('<svg ', '<svg role="img" aria-label="QR para escribir por WhatsApp" ');
  let html = fs.readFileSync(HTML, 'utf8');
  if (!/<!--qr:wa-->[\s\S]*?<!--\/qr-->/.test(html)) { console.error('No encontré la marca del QR (<!--qr:wa--><!--/qr-->) en index.html.'); process.exit(1); }
  html = html.replace(/<!--qr:wa-->[\s\S]*?<!--\/qr-->/, `<!--qr:wa-->${svg.trim()}<!--/qr-->`);
  fs.writeFileSync(HTML, html);

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await p.goto('file://' + HTML, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const fuentes = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight));
  if (!fuentes.some(f => f.startsWith('Chivo'))) console.log('AVISO: no cargaron las letras de Google Fonts (¿sin internet?). El flyer sale con letras de reemplazo.');
  const box = await p.evaluate(() => { const r = document.querySelector('.hoja').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  await p.screenshot({ path: path.join(DIR, 'flyer.png'), clip: box });
  // Vista previa para compartir: la parte de arriba de la hoja (foto, título y la muestra gratis), en 1200×630.
  const og = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1200 / 794 });
  await og.emulateMedia({ media: 'print' }); // fondo blanco alrededor de la hoja, para que no quede un filo gris
  await og.goto('file://' + HTML, { waitUntil: 'networkidle' });
  await og.evaluate(() => document.fonts.ready);
  await og.addStyleTag({ content: '.lista h2{visibility:hidden}' }); // que no asome cortado abajo
  await og.screenshot({ path: path.join(DIR, 'og.jpg'), type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 794, height: 417 } }); // 794×417 a 1,51x = 1200×630
  await og.close();
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: path.join(DIR, 'flyer.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('Listo: flyer/flyer.pdf (A4), flyer/flyer.png y flyer/og.jpg. El QR abre WhatsApp con: «' + MENSAJE + '»');
})().catch(e => { console.error(e.message); process.exit(1); });
