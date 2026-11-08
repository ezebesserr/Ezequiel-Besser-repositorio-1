// Actualiza el dólar de referencia de creador/negocio/precios.md con el oficial del día (venta, dolarapi.com).
// Uso: node dolar.js            (trae la cotización del día)
//      node dolar.js --valor 1575 [--fecha 7/11/2026]   (si no hay red, a mano)
// Después de correrlo, actualizá también el dólar del Mostrador (Ajustes) y, si cambió mucho, volvé a armar el
// catálogo del WhatsApp propio (catalogo-propio.js).
const fs = require('fs');
const path = require('path');
const ARCHIVO = path.resolve(__dirname, '../../../../creador/negocio/precios.md');

(async () => {
  const a = process.argv.slice(2);
  const opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : null; };
  let valor = opt('valor') ? Number(String(opt('valor')).replace(/\./g, '').replace(',', '.')) : null;
  let fecha = opt('fecha');
  if (!valor) {
    try {
      let j;
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
        j = await (await fetch('https://dolarapi.com/v1/dolares/oficial', { signal: ctl.signal })).json(); clearTimeout(t);
      } catch (e) {
        // El fetch de Node no usa el proxy de las sesiones en la nube; curl sí.
        j = JSON.parse(require('child_process').execFileSync('curl', ['-sS', '-m', '10', 'https://dolarapi.com/v1/dolares/oficial']).toString());
      }
      valor = Number(j.venta);
      fecha = fecha || new Date(j.fechaActualizacion || Date.now()).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    } catch (e) {
      console.error('No pude traer la cotización (sin red o dolarapi.com no responde). Pasala a mano: node dolar.js --valor 1575');
      process.exit(1);
    }
  }
  if (!valor || valor < 1) { console.error('La cotización no es un número válido.'); process.exit(1); }
  fecha = fecha || new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  const md = fs.readFileSync(ARCHIVO, 'utf8');
  const re = /Dólar oficial de referencia:\s*\$[\d.]+\s*\([^)]*\)/;
  if (!re.test(md)) { console.error('No encontré la línea «Dólar oficial de referencia» en precios.md.'); process.exit(1); }
  const anterior = (/Dólar oficial de referencia:\s*\$([\d.]+)/.exec(md) || [])[1];
  const nuevo = md.replace(re, `Dólar oficial de referencia: $${Math.round(valor).toLocaleString('es-AR')} (venta en el Banco Nación, ${fecha})`);
  fs.writeFileSync(ARCHIVO, nuevo);
  console.log(`Dólar de referencia: $${anterior} → $${Math.round(valor).toLocaleString('es-AR')} (${fecha}). Actualizá también el Mostrador (Ajustes).`);
})();
