// Saca el flyer para mandar por WhatsApp desde flyer/index.html:
//   flyer.png (1080×1350, al doble de resolución) y og.jpg (1200×630, la vista previa cuando se comparte el link).
// Después de cambiar un texto o el WhatsApp en index.html, corré: node flyer/generar.js
// Necesita Playwright con Chromium e internet para las letras de Google Fonts.
const path = require('path');

const DIR = __dirname;
const HTML = 'file://' + path.join(DIR, 'index.html');

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();

  const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  await p.goto(HTML, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const fuentes = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family));
  if (!fuentes.some(f => f.startsWith('Chivo'))) console.log('AVISO: no cargaron las letras de Google Fonts (¿sin internet?). El flyer sale con letras de reemplazo.');
  const desborde = await p.evaluate(() => {
    const l = document.querySelector('.lamina');
    return l.scrollHeight > l.clientHeight + 1 || [...document.querySelectorAll('.trabajos li')].some(li => li.getBoundingClientRect().height > 100);
  });
  if (desborde) console.log('AVISO: algún texto no entra (se pasa del marco o un renglón de la lista se partió en dos). Acortalo y volvé a correr.');
  await p.screenshot({ path: path.join(DIR, 'flyer.png'), clip: { x: 0, y: 0, width: 1080, height: 1350 } });

  // Vista previa para compartir el link: la parte de arriba (título y foto), en 1200×630.
  const og = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1200 / 1080 });
  await og.goto(HTML, { waitUntil: 'networkidle' });
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: path.join(DIR, 'og.jpg'), type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1080, height: 567 } });

  await b.close();
  console.log('Listo: flyer/flyer.png (para mandar por WhatsApp) y flyer/og.jpg.');
})().catch(e => { console.error(e.message); process.exit(1); });
