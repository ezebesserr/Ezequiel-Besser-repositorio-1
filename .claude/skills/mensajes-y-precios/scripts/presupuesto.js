// Arma el presupuesto de un cliente en un paso: HTML + PDF para mandar y el texto para WhatsApp.
// Los precios salen de creador/negocio/precios.md y la firma de creador/negocio/perfil.md: no hay números escritos acá.
//
// Uso:
//   node presupuesto.js --cliente "Refrigeración La Lucila" --paquete completa \
//     [--extra idioma] [--extra qr] [--abono presencia] [--lanzamiento] [--dolar 1560] \
//     [--muestra URL] [--contacto "Nombre"] [--telefono "11 2684-0328"] [--alias "mi.alias.mp"] \
//     [--plazo "10 a 14 días"] --salida <carpeta-privada>
//
// --paquete, --extra y --abono buscan por parte del nombre en precios.md (completa, catalogo, presencia + ia, idioma, qr…).
// Sin --dolar, prueba la cotización del día en dolarapi.com y, si no llega, usa la de referencia de precios.md (y avisa).
// Deja presupuesto.html, presupuesto.pdf y mensaje.txt en la carpeta de salida, que tiene que estar FUERA del repo.
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../../../..');

function args() {
  const a = process.argv.slice(2), o = { extra: [] };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (!k.startsWith('--')) continue;
    const nombre = k.slice(2), sig = a[i + 1];
    if (nombre === 'lanzamiento') { o.lanzamiento = true; continue; }
    if (sig === undefined || sig.startsWith('--')) { console.error(`Falta el valor de ${k}`); process.exit(1); }
    if (nombre === 'extra') o.extra.push(sig); else o[nombre] = sig;
    i++;
  }
  return o;
}

function sinAcentos(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

// Lee precios.md: tablas con columna USD, extras, mantenimiento, condiciones y dólar de referencia
function leerPrecios() {
  const md = fs.readFileSync(path.join(REPO, 'creador/negocio/precios.md'), 'utf8');
  const items = [];
  let seccion = 'Webs';
  for (const linea of md.split('\n')) {
    const h = /^##\s+(.+)$/.exec(linea);
    if (h) { seccion = h[1].replace(/\s*\(skill.*\)\s*$/, '').trim(); continue; }
    const fila = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*$/.exec(linea);
    if (fila && !/^-+$/.test(fila[1])) {
      const incluye = fila[2];
      items.push({ nombre: fila[1], incluye, usd: Number(fila[3]), seccion, mensual: /por mes/i.test(incluye), porPersona: /por persona/i.test(incluye) });
    }
  }
  const extras = [];
  const ex = /\*\*Extras\*\*:\s*(.+)/.exec(md);
  if (ex) ex[1].split('·').forEach(p => { const m = /(.+?)\s+USD\s+(\d+)/.exec(p.trim()); if (m) extras.push({ nombre: m[1].trim(), usd: Number(m[2]), incluye: '' }); });
  const mant = /\*\*Mantenimiento\*\*:\s*USD\s*(\d+)\s*por mes\s*\(([^)]+)\)/.exec(md);
  if (mant) items.push({ nombre: 'Mantenimiento', incluye: mant[2], usd: Number(mant[1]), seccion: 'Webs', mensual: true });
  const cond = (/## Condiciones\n([\s\S]*?)\n## /.exec(md) || [])[1] || '';
  const condiciones = cond.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).replace(/\*\*/g, '').trim());
  const ref = /Dólar oficial de referencia:\s*\$([\d.]+)\s*\(([^)]*)\)/.exec(md);
  const lanz = /(\d+)\s*% menos para los tres primeros/.exec(md);
  return { items, extras, condiciones, dolarRef: ref ? Number(ref[1].replace(/\./g, '')) : null, dolarRefTxt: ref ? ref[2] : '', lanzamiento: lanz ? Number(lanz[1]) : 0 };
}

function leerPerfil() {
  const md = fs.readFileSync(path.join(REPO, 'creador/negocio/perfil.md'), 'utf8');
  const campo = n => { const m = new RegExp('\\*\\*' + n + '\\*\\*:\\s*(.+)').exec(md); const v = m ? m[1].trim() : ''; return /completar/i.test(v) ? '' : v.replace(/\s*\(si firman.*$/i, ''); };
  return { firma: campo('Nombre para firmar'), presentacion: campo('Presentación'), whatsapp: campo('WhatsApp para clientes'), mail: campo('Mail para clientes') };
}

function buscar(lista, q, que) {
  const s = sinAcentos(q);
  const exacto = lista.find(i => sinAcentos(i.nombre) === s);
  if (exacto) return exacto;
  const encontrados = lista.filter(i => sinAcentos(i.nombre).includes(s));
  if (encontrados.length === 1) return encontrados[0];
  const nombres = lista.map(i => i.nombre).join(', ');
  console.error(encontrados.length ? `«${q}» coincide con varios ${que}: ${encontrados.map(i => i.nombre).join(', ')}. Escribilo más completo.` : `No encontré «${q}» entre los ${que}: ${nombres}.` + (que.includes('único') ? ' Si es un abono mensual, va con --abono.' : ''));
  process.exit(1);
}

async function dolarDelDia() {
  try {
    let j;
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch('https://dolarapi.com/v1/dolares/oficial', { signal: ctl.signal }); clearTimeout(t);
      j = await r.json();
    } catch (e) {
      // El fetch de Node no usa el proxy de las sesiones en la nube; curl sí.
      j = JSON.parse(require('child_process').execFileSync('curl', ['-sS', '-m', '8', 'https://dolarapi.com/v1/dolares/oficial'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString());
    }
    if (j && j.venta) return { valor: Number(j.venta), fuente: 'dólar oficial, venta, ' + new Date(j.fechaActualizacion || Date.now()).toLocaleDateString('es-AR') };
  } catch (e) { /* sin red: se usa la referencia */ }
  return null;
}

function pesos(n) { return '$ ' + (Math.round(n / 1000) * 1000).toLocaleString('es-AR'); }
function usd(n) { return 'USD ' + (Math.round(n * 100) / 100).toLocaleString('es-AR'); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function slug(s) { return sinAcentos(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30); }
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

(async () => {
  const o = args();
  if (!o.cliente || !o.paquete || !o.salida) {
    console.error('Uso: node presupuesto.js --cliente "Negocio" --paquete completa [--extra idioma] [--abono presencia] [--lanzamiento] [--dolar 1560] [--muestra URL] --salida <carpeta-privada>');
    process.exit(1);
  }
  const salida = path.resolve(o.salida);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La carpeta de salida está dentro del repo, que es público. Usá una carpeta privada.'); process.exit(1); }

  const P = leerPrecios(), perfil = leerPerfil();
  const unicos = P.items.filter(i => !i.mensual);
  const mensuales = P.items.filter(i => i.mensual);
  const paquete = buscar(unicos, o.paquete, 'paquetes y servicios de pago único');
  const extras = o.extra.map(e => buscar(P.extras, e, 'extras'));
  const abono = o.abono ? buscar(mensuales, o.abono, 'abonos') : null;

  let dolar, fuenteDolar, avisoDolar = '';
  if (o.dolar) { dolar = Number(o.dolar); fuenteDolar = 'dólar oficial, venta (cargado a mano)'; }
  else {
    const d = await dolarDelDia();
    if (d) { dolar = d.valor; fuenteDolar = d.fuente; }
    else { dolar = P.dolarRef; fuenteDolar = 'dólar oficial de referencia (' + P.dolarRefTxt + ')'; avisoDolar = 'No pude traer el dólar del día: usé la referencia de precios.md. Pasá --dolar con la cotización de hoy antes de mandarlo.'; }
  }
  if (!dolar) { console.error('No hay cotización del dólar: pasá --dolar.'); process.exit(1); }

  // «Lo de Esencial + …»: el cliente no conoce los nombres de los paquetes, así que se escribe todo lo que incluye
  const expandir = (texto, prof) => {
    const m = /^Lo de (.+?) \+\s*(.+)$/.exec(texto);
    const base = m && prof < 4 ? unicos.find(i => i.nombre === m[1]) : null;
    if (!base) return texto;
    return expandir(base.incluye, prof + 1).replace(/\s*(Lista en [^.]+|Unas? \d+ semanas?)\.\s*$/i, '').replace(/\.?\s*$/, '.') + ' Además: ' + m[2];
  };
  const lineas = [{ nombre: paquete.nombre, incluye: expandir(paquete.incluye, 0), usd: paquete.usd }].concat(extras.map(e => ({ nombre: 'Extra: ' + e.nombre, incluye: '', usd: e.usd })));
  const subtotal = lineas.reduce((s, l) => s + l.usd, 0);
  const desc = o.lanzamiento && P.lanzamiento ? Math.round(subtotal * P.lanzamiento) / 100 : 0;
  const total = subtotal - desc;
  const totalPesos = Math.round(total * dolar / 1000) * 1000;
  const mitad = Math.round(totalPesos / 2 / 1000) * 1000;
  const hoy = new Date();
  const vence = new Date(hoy.getTime() + 15 * 86400000);
  const f = d => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const numero = hoy.toISOString().slice(0, 10) + '-' + slug(o.cliente);
  const plazo = (o.plazo || ((/(Lista en [^.]+|Unas? \d+ semanas?)/i.exec(paquete.incluye) || [])[1] || 'a convenir'))
    .replace(/^Lista en /i, '').replace(/^U/, 'u');
  const condiciones = P.condiciones.filter(c => /50%|rondas|dominio|fotos y textos/i.test(c));
  const hueco = (v, t) => v ? esc(v) : `<span class="falta">${esc(t)}</span>`;

  const filas = lineas.map(l => `<tr><td><b>${esc(l.nombre)}</b>${l.incluye ? `<span class="incl">${esc(l.incluye)}</span>` : ''}</td><td class="n">${usd(l.usd)}</td></tr>`).join('');
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Presupuesto ${esc(o.cliente)} · ${esc(perfil.firma || 'páginas web')}</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Chivo+Mono:wght@400;600&family=Chivo:wght@800;900&display=swap">
<style>
  :root{--tinta:#182019;--gris:#4f5a52;--linea:#d3d9d4;--birome:#2342ac;--fondo:#f5f7f5;--falta:#fff2b8;
    --f-tit:"Chivo","Arial Narrow",Arial,sans-serif;--f-txt:"Alegreya Sans","Segoe UI",sans-serif;--f-num:"Chivo Mono",ui-monospace,monospace}
  *{box-sizing:border-box}
  body{margin:0;background:#fff;color:var(--tinta);font:16px/1.5 var(--f-txt)}
  .hoja{max-width:780px;margin:0 auto;padding:36px max(20px,env(safe-area-inset-left)) 40px max(20px,env(safe-area-inset-right))}
  .cab{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-bottom:3px solid var(--tinta);padding-bottom:14px}
  h1{font:900 2rem/1 var(--f-tit);margin:0}
  .num-doc{font:600 13px/1.4 var(--f-num);color:var(--gris);text-align:right}
  .partes{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}
  .partes h2{font:600 11px/1.2 var(--f-num);letter-spacing:.06em;text-transform:uppercase;color:var(--gris);margin:0 0 4px}
  .partes p{margin:0}
  .muestra{margin-top:16px;padding:10px 12px;background:var(--fondo);border-left:4px solid var(--birome)}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  th{font:600 11px/1.2 var(--f-num);letter-spacing:.06em;text-transform:uppercase;color:var(--gris);text-align:left;border-bottom:2px solid var(--tinta);padding:8px 0}
  td{padding:10px 0;border-bottom:1px solid var(--linea);vertical-align:top}
  td.n,th.n{text-align:right;font-family:var(--f-num);white-space:nowrap;padding-left:16px}
  .incl{display:block;color:var(--gris);font-size:.95rem;margin-top:2px}
  tr.total td{border-bottom:0;font-weight:700;font-size:1.1rem;padding-top:14px}
  tr.desc td{color:var(--birome)}
  .pesos{margin-top:14px;padding:14px;border:2px solid var(--tinta);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:baseline}
  .pesos b{font:900 1.6rem/1 var(--f-tit)}
  .pesos small{display:block;color:var(--gris);font-size:.9rem}
  .bloques{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:20px}
  .bloques h2{font:800 1.05rem/1.2 var(--f-tit);margin:0 0 6px}
  .bloques p,.bloques ul{margin:0}
  ul{padding-left:1.1em} li{margin:3px 0}
  .falta{background:var(--falta);padding:0 3px}
  .aviso{margin-top:22px;font-size:.9rem;color:var(--gris)}
  .firma{margin-top:26px}
  @media (max-width:600px){.partes,.bloques{grid-template-columns:1fr}.num-doc{text-align:left}}
  @media print{.hoja{padding:0}}
</style></head><body><main class="hoja">
  <div class="cab"><h1>Presupuesto</h1><p class="num-doc">N.º ${esc(numero)}<br>${f(hoy)}<br>Válido hasta el ${f(vence)}</p></div>
  <div class="partes">
    <div><h2>Para</h2><p><b>${esc(o.cliente)}</b>${o.contacto ? '<br>' + esc(o.contacto) : ''}</p></div>
    <div><h2>De</h2><p><b>${hueco(perfil.firma, 'nombre (perfil.md)')}</b><br>${hueco(perfil.presentacion, 'presentación')}<br>WhatsApp: ${hueco(perfil.whatsapp, 'completar en perfil.md')}<br>Mail: ${hueco(perfil.mail, 'completar en perfil.md')}</p></div>
  </div>
  ${o.muestra ? `<p class="muestra">La muestra que vieron: <a href="${esc(o.muestra)}">${esc(o.muestra)}</a></p>` : ''}
  <table><thead><tr><th>Qué incluye</th><th class="n">Precio</th></tr></thead><tbody>
    ${filas}
    ${desc ? `<tr class="desc"><td>Precio de lanzamiento (${P.lanzamiento} % menos, a cambio de mostrar el trabajo y una reseña en Google)</td><td class="n">− ${usd(desc)}</td></tr>` : ''}
    <tr class="total"><td>Total</td><td class="n">${usd(total)}</td></tr>
  </tbody></table>
  <div class="pesos"><div><small>Total en pesos</small><b>${pesos(total * dolar)}</b></div><div><small>${esc(fuenteDolar)}: $ ${dolar.toLocaleString('es-AR')} por dólar</small><small>Redondeado a miles · válido 15 días</small></div></div>
  <div class="bloques">
    <div><h2>Forma de pago</h2><p>${pesos(mitad)} para arrancar y ${pesos(totalPesos - mitad)} al publicar.<br>Transferencia a: ${hueco(o.alias, 'alias o CBU')}</p></div>
    <div><h2>Plazo</h2><p>${esc(plazo)} desde la seña y con el material del negocio.</p></div>
    ${abono ? `<div><h2>Después: ${esc(abono.nombre)}</h2><p>${usd(abono.usd)} por mes (hoy ${pesos(abono.usd * dolar)}). ${esc(abono.incluye.replace(/\s*Por mes\.?\s*$/i, ''))}</p></div>` : ''}
    <div><h2>Condiciones</h2><ul>${condiciones.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
  </div>
  <p class="firma">${hueco(perfil.firma, 'nombre')}</p>
  <p class="aviso">Este presupuesto no es una factura. Si necesitan factura, avísennos antes de pagar.</p>
</main></body></html>`;

  const texto = [
    `Hola${o.contacto ? ' ' + o.contacto : ''}, ¿cómo andan? Les paso el presupuesto para ${o.cliente}:`,
    '',
    `• ${paquete.nombre}${extras.length ? ' + ' + extras.map(e => e.nombre).join(' + ') : ''}: ${usd(total)}${desc ? ` (con el ${P.lanzamiento} % de lanzamiento)` : ''}, que hoy son ${pesos(total * dolar)} al dólar oficial.`,
    `• Se paga ${pesos(mitad)} para arrancar y el resto al publicar.${o.alias ? ' Transferencia a ' + o.alias + '.' : ''}`,
    `• Plazo: ${plazo} desde la seña.`,
    abono ? `• Después, ${abono.nombre}: ${usd(abono.usd)} por mes (hoy ${pesos(abono.usd * dolar)}).` : null,
    '',
    'El precio vale por 15 días. Les dejo el detalle en el PDF. ¿Lo arrancamos?'
  ].filter(x => x !== null).join('\n');

  fs.mkdirSync(salida, { recursive: true });
  const htmlPath = path.join(salida, 'presupuesto.html');
  fs.writeFileSync(htmlPath, html);
  fs.writeFileSync(path.join(salida, 'mensaje.txt'), texto + '\n');
  try {
    const { chromium } = require('playwright');
    const b = await chromium.launch(); const p = await b.newPage();
    await p.goto('file://' + htmlPath, { waitUntil: 'load' }); await p.waitForTimeout(600);
    await p.pdf({ path: path.join(salida, 'presupuesto.pdf'), format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
    await b.close();
  } catch (e) { console.error('No pude armar el PDF (' + e.message.split('\n')[0] + '). El HTML quedó igual.'); }

  console.log(`Presupuesto ${numero}: ${usd(total)} = ${pesos(total * dolar)} (${fuenteDolar}: $ ${dolar}).`);
  if (avisoDolar) console.log('AVISO: ' + avisoDolar);
  const faltan = [!perfil.whatsapp && 'tu WhatsApp (perfil.md)', !perfil.mail && 'tu mail (perfil.md)', !o.alias && 'el alias o CBU (--alias)'].filter(Boolean);
  if (faltan.length) console.log('Quedan marcados en amarillo: ' + faltan.join(', ') + '.');
  const n = waNumero(o.telefono);
  if (n) console.log('WhatsApp listo: https://wa.me/' + n + '?text=' + encodeURIComponent(texto));
  console.log('Archivos: ' + ['presupuesto.pdf', 'presupuesto.html', 'mensaje.txt'].map(x => path.join(salida, x)).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
