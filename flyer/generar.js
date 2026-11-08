// Saca el flyer para mandar por WhatsApp desde flyer/index.html:
//   flyer.png (1080×1350, al doble de resolución) y og.jpg (1200×630, la vista previa cuando se comparte el link).
// Después de cambiar un texto o el WhatsApp en index.html, corré: node flyer/generar.js (avisa si algo no entra).
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
  const fuentes = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')));
  const faltan = ['Encode Sans', 'Nanum Pen Script'].filter(f => !fuentes.includes(f));
  if (faltan.length) console.log('AVISO: no cargaron ' + faltan.join(' y ') + ' (¿sin internet?). El flyer sale con letras de reemplazo.');
  const problemas = await p.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect();
    const se = (a, b) => a.bottom > b.top && a.top < b.bottom && a.right > b.left && a.left < b.right;
    const out = [];
    const cab = r('.cabeza'), com = r('.comanda'), pie = r('.pie');
    if (se(cab, com)) out.push('el título se encima con la comanda');
    if (se(com, pie)) out.push('la comanda se encima con el teléfono');
    if (pie.bottom > 1350 || cab.top < 0) out.push('algo se sale de la imagen');
    document.querySelectorAll('.comanda .mano').forEach(m => { if (m.getBoundingClientRect().right > com.right - 12) out.push('no entra en la comanda: «' + m.textContent.trim().split('\n')[0] + '»'); });
    return out;
  });
  problemas.forEach(x => console.log('AVISO: ' + x + '. Acortá el texto o movelo y volvé a correr.'));
  await p.screenshot({ path: path.join(DIR, 'flyer.png'), clip: { x: 0, y: 0, width: 1080, height: 1350 } });

  // Vista previa para compartir el link: la parte de arriba (título y foto), en 1200×630.
  const og = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1200 / 1080 });
  await og.goto(HTML, { waitUntil: 'networkidle' });
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: path.join(DIR, 'og.jpg'), type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1080, height: 567 } });

  await b.close();
  console.log('Listo: flyer/flyer.png (para mandar por WhatsApp) y flyer/og.jpg.');
})().catch(e => { console.error(e.message); process.exit(1); });
