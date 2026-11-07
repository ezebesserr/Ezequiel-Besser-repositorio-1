// Campaña por WhatsApp a los clientes que ya tiene un comercio (idea MKT-05).
// Envío:   node campana.js clientes.csv campana.json --salida <carpeta-privada>
// Informe: node campana.js --informe resultados.csv --negocio "Nombre" [--campana "Fiestas 2026"] --salida <carpeta-privada>
//
// clientes.csv: nombre, telefono, acepta (si/no) y, si hay, segmento. Solo se les escribe a los que dicen «si» en
// acepta (Ley 25.326 de datos personales: tienen que haber aceptado recibir mensajes). Sin esa columna no arranca.
// campana.json: { "negocio", "titulo", "mensajes": { "todos": "Hola {nombre}…", "<segmento>": "…" }, "por_dia": 40 }
// Deja envio.html (la cola: un toque por cliente abre WhatsApp con su mensaje, y recuerda a quién ya se le mandó),
// resultados.csv (para anotar quién respondió y quién compró) y difusion.txt (cómo hacerlo con listas de difusión).
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');

function args() {
  const a = process.argv.slice(2), o = { _: [] };
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1]; i++; } else o._.push(a[i]); }
  return o;
}
function csv(texto) {
  texto = texto.replace(/^﻿/, '');
  const l0 = texto.split('\n')[0], sep = (l0.match(/;/g) || []).length > (l0.match(/,/g) || []).length ? ';' : ',';
  const filas = []; let f = [], c = '', q = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (q) { if (ch === '"' && texto[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { f.push(c); c = ''; }
    else if (ch === '\n') { f.push(c.replace(/\r$/, '')); filas.push(f); f = []; c = ''; } else c += ch;
  }
  if (c || f.length) { f.push(c); filas.push(f); }
  const [cab, ...resto] = filas.filter(x => x.some(v => v.trim()));
  const claves = cab.map(k => k.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
  return resto.map(x => Object.fromEntries(claves.map((k, i) => [k, (x[i] || '').trim()])));
}
function waNumero(tel) {
  let d = String(tel || '').replace(/\D/g, ''); if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54') && d.length >= 12) { d = d.slice(2); if (d[0] === '9') d = d.slice(1); }
  if (d[0] === '0') d = d.slice(1);
  if (d.length === 12) for (let a = 2; a <= 4; a++) if (d.substr(a, 2) === '15') { d = d.slice(0, a) + d.slice(a + 2); break; }
  if (d.length === 10 && d.startsWith('15')) d = '11' + d.slice(2);
  return d.length === 10 ? '549' + d : null;
}
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fuera = s => { const r = path.resolve(s); if (r === REPO || r.startsWith(REPO + path.sep)) { console.error('La salida va fuera del repo, que es público.'); process.exit(1); } return r; };

async function informe(o) {
  const filas = csv(fs.readFileSync(o.informe, 'utf8'));
  const si = v => /^(si|sí|s|x|1)$/i.test(String(v || '').trim());
  const enviados = filas.filter(r => si(r.enviado)), resp = filas.filter(r => si(r.respondio)), compras = filas.filter(r => si(r.compro));
  const monto = compras.reduce((s, r) => s + (Number(String(r.monto || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0), 0);
  const pct = (a, b) => b ? Math.round(a / b * 100) + ' %' : '—';
  const salida = fuera(o.salida); fs.mkdirSync(salida, { recursive: true });
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Resultados · ${esc(o.negocio)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;800&display=swap"><style>
*{box-sizing:border-box;margin:0;padding:0} body{width:794px;min-height:1123px;padding:48px;font:16px/1.45 Barlow,system-ui,sans-serif;color:#1b1f23}
.eti{font-weight:600;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#56606a} h1{font-size:34px;font-weight:800;margin:6px 0 26px}
.nums{display:grid;grid-template-columns:repeat(4,1fr);gap:12px} .nums div{border:2px solid #1b1f23;padding:14px} .nums b{display:block;font-size:34px;font-weight:800}
.nums span{font-size:14px;color:#56606a} p{margin-top:22px;max-width:620px}</style></head><body>
<p class="eti">Campaña por WhatsApp · ${esc(o.campana || '')}</p><h1>Resultados de ${esc(o.negocio)}</h1>
<div class="nums"><div><b>${enviados.length}</b><span>mensajes enviados</span></div><div><b>${resp.length}</b><span>respondieron (${pct(resp.length, enviados.length)})</span></div>
<div><b>${compras.length}</b><span>compraron (${pct(compras.length, enviados.length)})</span></div><div><b>$ ${Math.round(monto).toLocaleString('es-AR')}</b><span>en ventas anotadas</span></div></div>
<p>Las ventas son las que el comercio anotó como hechas por la campaña. Los que pidieron no recibir más mensajes ya no están en la lista de la próxima.</p></body></html>`;
  fs.writeFileSync(path.join(salida, 'informe.html'), html);
  const { chromium } = require('playwright'); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
  await p.goto('file://' + path.join(salida, 'informe.html'), { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.pdf({ path: path.join(salida, 'informe.pdf'), format: 'A4', printBackground: true }); await b.close();
  console.log(`${enviados.length} enviados, ${resp.length} respondieron, ${compras.length} compraron, $ ${Math.round(monto).toLocaleString('es-AR')}. Informe: ${path.join(salida, 'informe.pdf')}`);
}

(async () => {
  const o = args();
  if (o.informe) return informe(o);
  if (o._.length < 2 || !o.salida) { console.error('Uso: node campana.js clientes.csv campana.json --salida <carpeta>  ·  node campana.js --informe resultados.csv --negocio "X" --salida <carpeta>'); process.exit(1); }
  const salida = fuera(o.salida); fs.mkdirSync(salida, { recursive: true });
  const clientes = csv(fs.readFileSync(o._[0], 'utf8'));
  const C = JSON.parse(fs.readFileSync(o._[1], 'utf8'));
  if (!clientes.length || !('acepta' in clientes[0])) { console.error('Falta la columna «acepta» (si/no): solo se escribe a quienes aceptaron recibir mensajes (Ley 25.326).'); process.exit(1); }
  const vistos = new Set(), cola = [], fuera_ = { no_acepta: 0, sin_numero: 0, repetidos: 0 };
  for (const c of clientes) {
    if (!/^(si|sí|s|x|1)$/i.test(c.acepta)) { fuera_.no_acepta++; continue; }
    const n = waNumero(c.telefono || c.whatsapp || c.celular);
    if (!n) { fuera_.sin_numero++; continue; }
    if (vistos.has(n)) { fuera_.repetidos++; continue; }
    vistos.add(n);
    const plantilla = (C.mensajes || {})[c.segmento] || (C.mensajes || {}).todos;
    if (!plantilla) { console.error(`No hay mensaje para el segmento «${c.segmento}» ni uno «todos» en campana.json.`); process.exit(1); }
    const nombre = (c.nombre || '').split(/\s+/)[0];
    const texto = plantilla.replace(/\{nombre\}/g, nombre || '').replace(/Hola ,/g, 'Hola,').replace(/\s+,/g, ',');
    cola.push({ id: n, nombre: c.nombre || '', segmento: c.segmento || '', texto, link: 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto) });
  }
  const porDia = Number(C.por_dia) || 40;
  const clave = 'campana-' + (C.titulo || 'x').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Envío · ${esc(C.titulo || 'Campaña')}</title><style>
:root{--t:#1b1f23;--g:#56606a;--l:#d8dde1;--wa:#0b6b4a}*{box-sizing:border-box} body{margin:0;font:16px/1.4 system-ui,sans-serif;color:var(--t);background:#f3f4f2}
main{max-width:640px;margin:0 auto;padding:16px} h1{font-size:1.4rem;margin:0} .sub{color:var(--g);margin:4px 0 12px}
.barra{position:sticky;top:0;background:#f3f4f2;padding:8px 0;border-bottom:1px solid var(--l);z-index:2} progress{width:100%;height:10px}
.c{background:#fff;border:1px solid var(--l);border-radius:4px;padding:12px;margin:10px 0} .c.hecho{opacity:.5}
.c h2{font-size:1rem;margin:0 0 4px} .c small{color:var(--g)} .c p{white-space:pre-wrap;margin:8px 0;font-size:.95rem}
a.btn,button{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:3px;border:1.5px solid var(--wa);background:var(--wa);color:#fff;text-decoration:none;font:600 15px system-ui;cursor:pointer}
button.otro{background:#fff;color:var(--t);border-color:var(--l)} .aviso{background:#fff7d6;border:1px solid #e9d27a;padding:10px;border-radius:4px;font-size:.92rem}</style></head><body><main>
<h1>${esc(C.titulo || 'Campaña')}</h1><p class="sub">${esc(C.negocio || '')} · ${cola.length} clientes que aceptaron recibir mensajes</p>
<p class="aviso">Mandá como máximo ${porDia} por día y no más de uno por cliente. Si alguien pide no recibir más, anotalo en resultados.csv y se saca de la próxima.</p>
<div class="barra"><progress id="pr" max="${cola.length}" value="0"></progress> <span id="cuenta"></span></div>
${cola.map(x => `<section class="c" id="c-${x.id}"><h2>${esc(x.nombre)}</h2><small>${esc(x.segmento)} · +${x.id}</small><p>${esc(x.texto)}</p>
<a class="btn" href="${esc(x.link)}" target="_blank" rel="noopener" data-id="${x.id}">Mandar por WhatsApp</a> <button class="otro" type="button" data-id="${x.id}">Ya está</button></section>`).join('\n')}
</main><script>
var K=${JSON.stringify(clave)},hechos={};try{hechos=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
function pintar(){var n=0;document.querySelectorAll('.c').forEach(function(s){var id=s.id.slice(2);s.classList.toggle('hecho',!!hechos[id]);if(hechos[id])n++});
document.getElementById('pr').value=n;document.getElementById('cuenta').textContent=n+' de '+${cola.length}+' enviados'}
function marcar(id){hechos[id]=1;try{localStorage.setItem(K,JSON.stringify(hechos))}catch(e){}pintar()}
document.querySelectorAll('[data-id]').forEach(function(b){b.addEventListener('click',function(){marcar(b.getAttribute('data-id'))})});pintar();
</script></body></html>`;
  fs.writeFileSync(path.join(salida, 'envio.html'), html);
  fs.writeFileSync(path.join(salida, 'resultados.csv'), '﻿nombre;telefono;segmento;enviado;respondio;compro;monto;no_escribir_mas\n' + cola.map(x => [x.nombre, '+' + x.id, x.segmento, '', '', '', '', ''].join(';')).join('\n') + '\n');
  fs.writeFileSync(path.join(salida, 'difusion.txt'), `Otra forma, sin un toque por cliente: listas de difusión de WhatsApp Business.
- Le llega solo a quienes tienen guardado el número del comercio: por eso, en el mostrador, pedí que lo agenden.
- Cada lista admite hasta 256 contactos. Armá una por segmento (${[...new Set(cola.map(x => x.segmento || 'todos'))].join(', ')}).
- El mensaje es uno solo por lista: usá el de «todos» de campana.json sin {nombre}.
- Las respuestas llegan como chats individuales: anotalas en resultados.csv para el informe.
`);
  console.log(`${cola.length} en la cola (${fuera_.no_acepta} sin permiso, ${fuera_.sin_numero} sin celular válido, ${fuera_.repetidos} repetidos quedaron afuera).`);
  console.log(`A ${porDia} por día: ${Math.ceil(cola.length / porDia)} ${Math.ceil(cola.length / porDia) === 1 ? 'día' : 'días'}. Archivos: ${['envio.html', 'resultados.csv', 'difusion.txt'].map(x => path.join(salida, x)).join(', ')}`);
})().catch(e => { console.error(e); process.exit(1); });
