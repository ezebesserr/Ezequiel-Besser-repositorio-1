// Cierre de mes de los abonos de Presencia, en un comando.
// Recorre una carpeta privada con una subcarpeta por cliente (cada una con su datos.json, el mismo formato del
// informe), arma el informe de cada uno (HTML, PDF y vista previa) y deja una página con el mensaje del mes de cada
// cliente: el resumen, el monto del abono en pesos y el botón de WhatsApp con el texto ya escrito.
//
// Uso: node cierre.js <carpeta-clientes> <carpeta-salida> [--dolar 1575] [--alias "mi.alias.mp"]
//
// En datos.json, además de lo del informe, cada cliente puede tener:
//   "telefono": "11 2684-0328", "contacto": "Marta", "abono": "Presencia", "abono_usd": 40
// Las dos carpetas van FUERA del repo: son números y teléfonos de clientes.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const REPO = path.resolve(__dirname, '../../../..');

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function pesos(n) { return '$ ' + (Math.round(n / 1000) * 1000).toLocaleString('es-AR'); }
function waNumero(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54') && d.length >= 12) { d = d.slice(2); if (d[0] === '9') d = d.slice(1); }
  if (d[0] === '0') d = d.slice(1);
  if (d.length === 12) for (let a = 2; a <= 4; a++) if (d.substr(a, 2) === '15') { d = d.slice(0, a) + d.slice(a + 2); break; }
  if (d.length === 10 && d.startsWith('15')) d = '11' + d.slice(2);
  return d.length === 10 ? '549' + d : null;
}
async function dolarDelDia() {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const j = await (await fetch('https://dolarapi.com/v1/dolares/oficial', { signal: ctl.signal })).json(); clearTimeout(t);
    if (j && j.venta) return Number(j.venta);
  } catch (e) { /* sin red */ }
  return null;
}
function dolarReferencia() {
  const md = fs.readFileSync(path.join(REPO, 'creador/negocio/precios.md'), 'utf8');
  const m = /Dólar oficial de referencia:\s*\$([\d.]+)/.exec(md);
  return m ? Number(m[1].replace(/\./g, '')) : null;
}
function dentroDelRepo(p) { const a = path.resolve(p); return a === REPO || a.startsWith(REPO + path.sep); }

(async () => {
  const a = process.argv.slice(2);
  const opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : null; };
  const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
  if (pos.length < 2) { console.error('Uso: node cierre.js <carpeta-clientes> <carpeta-salida> [--dolar 1575] [--alias "alias"]'); process.exit(1); }
  const [dirClientes, dirSalida] = pos.map(p => path.resolve(p));
  if (dentroDelRepo(dirClientes) || dentroDelRepo(dirSalida)) { console.error('Las carpetas de clientes y de salida van fuera del repo, que es público.'); process.exit(1); }

  let dolar = opt('dolar') ? Number(opt('dolar')) : await dolarDelDia(), aviso = '';
  if (!dolar) { dolar = dolarReferencia(); aviso = 'No pude traer el dólar del día: usé la referencia de precios.md. Pasá --dolar antes de cobrar.'; }
  const alias = opt('alias') || '';

  const clientes = fs.readdirSync(dirClientes, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(dirClientes, d.name, 'datos.json')))
    .map(d => d.name).sort();
  if (!clientes.length) { console.error('No encontré subcarpetas con datos.json en ' + dirClientes); process.exit(1); }

  fs.mkdirSync(dirSalida, { recursive: true });
  const filas = [], errores = [];
  for (const c of clientes) {
    const datosPath = path.join(dirClientes, c, 'datos.json');
    let D;
    try { D = JSON.parse(fs.readFileSync(datosPath, 'utf8')); } catch (e) { errores.push(`${c}: datos.json no se puede leer (${e.message.split('\n')[0]})`); continue; }
    const salidaCliente = path.join(dirSalida, c);
    try {
      execFileSync(process.execPath, [path.join(__dirname, 'informe.js'), datosPath, salidaCliente], { stdio: 'pipe' });
    } catch (e) { errores.push(`${c}: no se pudo armar el informe (${String(e.stderr || e.message).split('\n')[0]})`); continue; }
    const v = (D.contactos && D.contactos.valores) || [];
    const total = v[v.length - 1] || 0, antes = v[v.length - 2] || 0;
    const variacion = antes ? Math.round((total - antes) / antes * 100) : null;
    const abonoUsd = Number(D.abono_usd) || 0;
    const monto = abonoUsd && dolar ? pesos(abonoUsd * dolar) : '';
    const saludo = D.contacto ? `Hola ${D.contacto}` : 'Hola';
    const lineaNum = `${total.toLocaleString('es-AR')} personas los contactaron desde Google` + (variacion !== null ? ` (${variacion >= 0 ? '+' : '−'}${Math.abs(variacion)} % que el mes anterior)` : '') + '.';
    const texto = [
      `${saludo}, ¿cómo andan? Les paso el informe de ${D.mes} de ${D.negocio}: ${lineaNum}`,
      D.resumen ? '' : null, D.resumen || null,
      D.pedimos && D.pedimos.length ? `\nPara ${D.proximo_mes || 'el mes que viene'} les pido: ${D.pedimos.join(' ').replace(/\.\s*$/, '')}.` : null,
      monto ? `\nEl abono${D.abono ? ' ' + D.abono : ''} de este mes es de ${monto} (USD ${abonoUsd}).${alias ? ' Pueden transferir a ' + alias + '.' : ''}` : null,
      '\nLes mando el PDF del informe acá abajo. ¡Gracias!'
    ].filter(x => x !== null).join('\n');
    const num = waNumero(D.telefono);
    filas.push({ carpeta: c, negocio: D.negocio, total, variacion, abonoUsd, monto, texto, wa: 'https://wa.me/' + (num || '') + '?text=' + encodeURIComponent(texto), num, pdf: path.join(salidaCliente, 'informe.pdf') });
  }

  const totalUsd = filas.reduce((s, f) => s + f.abonoUsd, 0);
  const mes = (filas[0] && JSON.parse(fs.readFileSync(path.join(dirClientes, filas[0].carpeta, 'datos.json'), 'utf8')).mes) || '';
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cierre de ${esc(mes)} · abonos</title><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Chivo+Mono:wght@400;600&family=Chivo:wght@800;900&display=swap">
<style>
  :root{--tinta:#182019;--gris:#4f5a52;--linea:#d3d9d4;--wa:#1d7f46;--fondo:#eef0ee;--birome:#2342ac}
  *{box-sizing:border-box} body{margin:0;background:var(--fondo);color:var(--tinta);font:17px/1.45 "Alegreya Sans",system-ui,sans-serif}
  .w{max-width:900px;margin:0 auto;padding:24px max(16px,env(safe-area-inset-left)) 60px max(16px,env(safe-area-inset-right))}
  h1{font:900 1.9rem/1.1 "Chivo",sans-serif;margin:0}
  .sub{color:var(--gris);margin:6px 0 18px}
  .total{font:600 14px/1.4 "Chivo Mono",monospace;background:#fff;border:1px solid var(--linea);padding:12px 14px;margin-bottom:16px}
  .c{background:#fff;border:1px solid var(--linea);border-radius:3px;padding:14px 16px;margin-bottom:12px;display:grid;gap:8px}
  .c h2{font:800 1.2rem/1.2 "Chivo",sans-serif;margin:0;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
  .c h2 span{font:600 13px "Chivo Mono",monospace;color:var(--gris)}
  pre{white-space:pre-wrap;font:15px/1.45 "Alegreya Sans",sans-serif;background:var(--fondo);padding:10px;margin:0}
  .acc{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  a.wa{background:var(--wa);color:#fff;text-decoration:none;font:600 12.5px "Chivo Mono",monospace;text-transform:uppercase;letter-spacing:.04em;padding:10px 14px;border-radius:2px}
  .pdf{font:13px "Chivo Mono",monospace;color:var(--gris);word-break:break-all}
  .aviso{background:#fff2b8;padding:10px 12px;margin-bottom:12px}
</style></head><body><main class="w">
<h1>Cierre de ${esc(mes)}</h1>
<p class="sub">Un mensaje por cliente: tocá WhatsApp, adjuntá el PDF que figura abajo y mandalo.</p>
${aviso ? `<p class="aviso">${esc(aviso)}</p>` : ''}
<p class="total">${filas.length} clientes · abonos del mes: USD ${totalUsd} ≈ ${pesos(totalUsd * dolar)} (dólar ${dolar.toLocaleString('es-AR')})</p>
${filas.map(f => `<section class="c"><h2>${esc(f.negocio)} <span>${f.total} contactos${f.variacion !== null ? ` · ${f.variacion >= 0 ? '+' : '−'}${Math.abs(f.variacion)} %` : ''}${f.monto ? ' · ' + esc(f.monto) : ''}</span></h2>
<pre>${esc(f.texto)}</pre>
<div class="acc"><a class="wa" href="${esc(f.wa)}" target="_blank" rel="noopener">${f.num ? 'Abrir WhatsApp' : 'WhatsApp (elegí el contacto)'}</a><span class="pdf">PDF: ${esc(f.pdf)}</span></div></section>`).join('\n')}
</main></body></html>`;
  fs.writeFileSync(path.join(dirSalida, 'cierre.html'), html);
  const csv = ['negocio,contactos,variacion,abono_usd,abono_pesos,telefono'].concat(filas.map(f => [f.negocio, f.total, f.variacion === null ? '' : f.variacion, f.abonoUsd, f.monto.replace(/[$ .]/g, ''), f.num || ''].map(x => /[",]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : x).join(','))).join('\n');
  fs.writeFileSync(path.join(dirSalida, 'cierre.csv'), csv + '\n');

  console.log(`Cierre de ${mes}: ${filas.length} informes. Abonos: USD ${totalUsd} ≈ ${pesos(totalUsd * dolar)}.`);
  if (aviso) console.log('AVISO: ' + aviso);
  filas.filter(f => !f.num).forEach(f => console.log(`Sin teléfono en datos.json: ${f.negocio} (el botón abre WhatsApp para elegir el contacto).`));
  errores.forEach(e => console.log('ERROR: ' + e));
  console.log('Abrí: ' + path.join(dirSalida, 'cierre.html'));
})().catch(e => { console.error(e); process.exit(1); });
