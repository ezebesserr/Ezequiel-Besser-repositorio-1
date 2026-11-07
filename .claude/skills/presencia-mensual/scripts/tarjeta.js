// Tarjeta de reseñas para el mostrador, con la identidad del cliente y un QR al formulario de reseñas de su ficha.
// Es parte de la Puesta a punto de Google. Deja:
//   tarjeta.pdf   A4 con cuatro tarjetas de 10 × 14 cm para imprimir y recortar (con marcas de corte)
//   tarjeta.png   una tarjeta sola, para mandar por WhatsApp o subir a las redes
//
// Uso: node tarjeta.js --negocio "Ferretería Rosca" --link "<link para pedir reseñas de la ficha>" \
//        [--marca "#12355b"] [--acento "#ffc629"] [--letra "Barlow Condensed"] [--frase "¿Te atendimos bien?"] \
//        --salida <carpeta>
//
// El link sale del Perfil de Negocio: «Pedir reseñas» o «Compartir formulario de reseñas». Nunca se ofrece nada a cambio
// de la reseña (Google lo prohíbe): la tarjeta solo invita.
const fs = require('fs');
const path = require('path');

function args() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1]; i++; }
  return o;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function contraste(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#ffffff';
  const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#16212c' : '#ffffff';
}

(async () => {
  const o = args();
  if (!o.negocio || !o.link || !o.salida) {
    console.error('Uso: node tarjeta.js --negocio "Negocio" --link "<link de reseñas>" [--marca "#hex"] [--acento "#hex"] [--letra "Familia de Google Fonts"] --salida <carpeta>');
    process.exit(1);
  }
  if (!/^https?:\/\//.test(o.link)) { console.error('El link tiene que empezar con https://'); process.exit(1); }
  const marca = o.marca || '#16212c', acento = o.acento || '#f0cf62', texto = contraste(marca);
  const letra = o.letra || 'Atkinson Hyperlegible';
  const frase = o.frase || '¿Te atendimos bien?';
  let qr = '';
  try {
    qr = await require('qrcode').toString(o.link, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#16212c', light: '#ffffff' } });
  } catch (e) { console.error('Falta la librería del QR: npm install -g qrcode'); process.exit(1); }

  const fuente = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(letra).replace(/%20/g, '+')}:wght@600;700;800&family=Atkinson+Hyperlegible:wght@400;700&display=swap">`;
  const tarjeta = `<div class="t">
      <p class="neg">${esc(o.negocio)}</p>
      <p class="frase">${esc(frase)}</p>
      <p class="pide">Contalo en Google: nos ayuda a que otros vecinos nos encuentren.</p>
      <div class="qr">${qr}</div>
      <p class="como">Escaneá el código con la cámara del celular</p>
      <p class="estrellas" aria-hidden="true">★★★★★</p>
    </div>`;
  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#fff;font-family:"Atkinson Hyperlegible",system-ui,sans-serif}
    .t{width:378px;height:529px;background:${marca};color:${texto};padding:30px 28px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;position:relative}
    .neg{font:800 26px/1.1 "${letra}",sans-serif;letter-spacing:.02em;text-transform:uppercase}
    .frase{font:700 34px/1.05 "${letra}",sans-serif;color:${acento};margin-top:6px}
    .pide{font-size:15.5px;line-height:1.35;max-width:26ch}
    .qr{width:190px;height:190px;background:#fff;padding:8px;border-radius:6px;margin-top:8px}
    .qr svg{width:100%;height:100%;display:block}
    .como{font-size:13px;opacity:.85}
    .estrellas{margin-top:auto;font-size:24px;letter-spacing:6px;color:${acento}}`;
  const sola = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${fuente}<style>${css}</style></head><body>${tarjeta}</body></html>`;
  const hoja = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">${fuente}<style>${css}
    @page{size:A4;margin:0}
    .hoja{width:794px;height:1123px;display:grid;grid-template-columns:378px 378px;grid-template-rows:529px 529px;gap:14px;justify-content:center;align-content:center}
    .hoja .t{outline:1px dashed #999;outline-offset:6px}</style></head><body><div class="hoja">${tarjeta.repeat(4)}</div></body></html>`;

  const salida = path.resolve(o.salida);
  fs.mkdirSync(salida, { recursive: true });
  fs.writeFileSync(path.join(salida, 'tarjeta.html'), hoja);
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 378, height: 529 }, deviceScaleFactor: 3 });
  await p.setContent(sola, { waitUntil: 'load' }); await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(salida, 'tarjeta.png'), clip: { x: 0, y: 0, width: 378, height: 529 } });
  await p.setViewportSize({ width: 794, height: 1123 });
  await p.goto('file://' + path.join(salida, 'tarjeta.html'), { waitUntil: 'load' }); await p.waitForTimeout(700);
  await p.pdf({ path: path.join(salida, 'tarjeta.pdf'), format: 'A4', printBackground: true });
  await b.close();
  console.log('Listo: ' + ['tarjeta.pdf (4 por hoja A4, recortar por la línea punteada)', 'tarjeta.png'].map(x => path.join(salida, x)).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
