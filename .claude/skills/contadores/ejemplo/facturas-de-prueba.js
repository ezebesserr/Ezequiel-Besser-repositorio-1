// Genera facturas de PRUEBA (datos inventados) con el texto típico de «Comprobantes en línea», y el link del QR en una.
// Uso: node facturas-de-prueba.js facturas.json <carpeta-de-salida>
const fs = require('fs'), path = require('path');
(async () => {
  const datos = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), out = process.argv[3];
  fs.mkdirSync(out, { recursive: true });
  const { chromium } = require('playwright'); const b = await chromium.launch(); const p = await b.newPage();
  for (const f of datos) {
    const qr = f.qr ? 'https://www.afip.gob.ar/fe/qr/?p=' + Buffer.from(JSON.stringify(f.qr)).toString('base64') : '';
    await p.setContent(`<html><body style="font:12px Arial"><p>ORIGINAL</p><h2>${f.letra}</h2><p>COD. ${f.cod}</p><p>FACTURA</p>
<p>Razón Social: ${f.razon}</p><p>Punto de Venta: ${f.pv} Comp. Nro: ${f.nro}</p><p>Fecha de Emisión: ${f.fecha}</p><p>CUIT: ${f.cuit}</p>
<p>Apellido y Nombre / Razón Social: Cliente Inventado SA</p><p>CUIT: ${f.receptor}</p>
${f.neto ? `<p>Importe Neto Gravado: $ ${f.neto}</p><p>IVA 21%: $ ${f.iva}</p>` : `<p>Subtotal: $ ${f.total}</p>`}<p>Importe Total: $ ${f.total}</p>
<p>CAE N°: ${f.cae}</p><p>Fecha de Vto. de CAE: 14/11/2026</p>${qr ? `<p><a href="${qr}">QR</a></p>` : ''}</body></html>`);
    await p.pdf({ path: path.join(out, f.archivo), format: 'A4' });
  }
  await b.close();
})();
