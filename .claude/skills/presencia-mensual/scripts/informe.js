// Arma el informe mensual de un cliente con la plantilla de muestras/presencia/index.html.
// Uso: node informe.js datos.json carpeta-salida
// Deja informe.html, informe.pdf (A4, para mandar por WhatsApp o mail) e informe.jpg (vista previa del celular).
// Los datos y los informes de clientes reales son privados: la carpeta de salida va FUERA del repo.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const [datosPath, salida] = process.argv.slice(2);
  if (!datosPath || !salida) { console.error('Uso: node informe.js datos.json carpeta-salida'); process.exit(1); }
  const repo = path.resolve(__dirname, '../../../..');
  const salidaAbs = path.resolve(salida);
  if (salidaAbs.startsWith(repo + path.sep)) {
    console.error('La carpeta de salida está dentro del repo, que es público. Usá una carpeta privada.');
    process.exit(1);
  }
  const datos = JSON.parse(fs.readFileSync(datosPath, 'utf8'));
  for (const campo of ['negocio', 'mes', 'titulo', 'contactos', 'acciones', 'busquedas', 'resenas', 'ia', 'hicimos']) {
    if (!(campo in datos)) { console.error(`Falta «${campo}» en ${datosPath}. Mirá el bloque de datos de la plantilla.`); process.exit(1); }
  }
  datos.muestra = false;
  const plantilla = fs.readFileSync(path.join(repo, 'muestras/presencia/index.html'), 'utf8');
  const bloque = /(<script type="application\/json" id="datos">)[\s\S]*?(<\/script>)/;
  if (!bloque.test(plantilla)) { console.error('No encontré el bloque de datos en la plantilla.'); process.exit(1); }
  const json = JSON.stringify(datos, null, 2).replace(/</g, '\\u003c');
  const html = plantilla
    .replace(bloque, `$1\n${json}\n$2`)
    .replace(/<title>[^<]*<\/title>/, `<title>Informe de ${datos.mes} · ${datos.negocio}</title>`)
    .replace(/\s*<meta property="og:[^>]*>|\s*<meta name="twitter:[^>]*>/g, '');

  fs.mkdirSync(salidaAbs, { recursive: true });
  const htmlPath = path.join(salidaAbs, 'informe.html');
  fs.writeFileSync(htmlPath, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 880, height: 1200 } });
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  await page.goto('file://' + htmlPath, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.pdf({ path: path.join(salidaAbs, 'informe.pdf'), format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(salidaAbs, 'informe.jpg'), type: 'jpeg', quality: 80 });
  await browser.close();
  if (errores.length) { console.error('Errores al dibujar el informe:\n- ' + errores.join('\n- ')); process.exit(1); }
  console.log('Listo: ' + ['informe.html', 'informe.pdf', 'informe.jpg'].map(f => path.join(salidaAbs, f)).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
