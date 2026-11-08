// Saca el flyer para mandar por WhatsApp desde flyer/index.html:
//   flyer.png (1080×1440, al doble de resolución) y og.jpg (1200×630, la vista previa cuando se comparte el link).
// Después de cambiar un texto o el WhatsApp en index.html, corré: node flyer/generar.js (avisa si algo no entra).
// Necesita Playwright con Chromium e internet para las letras de Google Fonts.
const path = require('path');

const DIR = __dirname;
const HTML = 'file://' + path.join(DIR, 'index.html');
const W = 1080, H = 1440;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();

  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await p.goto(HTML, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const fuentes = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')));
  if (!fuentes.includes('Libre Franklin')) console.log('AVISO: no cargó la letra de Google Fonts (¿sin internet?). El flyer sale con letras de reemplazo.');
  const problemas = await p.evaluate(() => {
    const out = [];
    const cuerpo = document.querySelector('.cuerpo');
    if (cuerpo.scrollHeight > cuerpo.clientHeight + 1) out.push('la lista no entra entera: se corta antes del pie');
    document.querySelectorAll('.servicios p').forEach(t => {
      const renglones = Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight));
      if (renglones > 2) out.push('«' + t.textContent.slice(0, 40) + '…» ocupa ' + renglones + ' renglones (mejor 2)');
    });
    return out;
  });
  problemas.forEach(x => console.log('AVISO: ' + x + '. Acortá el texto y volvé a correr.'));
  await p.screenshot({ path: path.join(DIR, 'flyer.png'), clip: { x: 0, y: 0, width: W, height: H } });

  // Vista previa para compartir el link: la parte de arriba (foto y título), en 1200×630.
  const og = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1200 / W });
  await og.goto(HTML, { waitUntil: 'networkidle' });
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: path.join(DIR, 'og.jpg'), type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: W, height: 567 } });

  await b.close();
  console.log('Listo: flyer/flyer.png (para mandar por WhatsApp) y flyer/og.jpg.');
})().catch(e => { console.error(e.message); process.exit(1); });
