// Lista de precios del comercio, lista para el mostrador y para WhatsApp, sin necesidad de web.
// Uso: node lista.js <catalogo.csv o base-nueva.csv> --negocio "Nombre" [--anterior base.csv] [--telefono "11 2345-6789"]
//        [--color "#12355b"] [--fecha 7/11/2026] --salida <carpeta-privada>
// Deja: lista.pdf (A4 para imprimir), lista-celular.pdf (angosta, para mandar), lista.txt (para pegar por rubro).
// Con --anterior marca lo que subió (▲) o bajó (▼) respecto de la lista anterior.
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');

function args() {
  const a = process.argv.slice(2), o = { _: [] };
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1]; i++; } else o._.push(a[i]); }
  return o;
}
function csv(texto) {
  const filas = []; let f = [], c = '', q = false;
  texto = texto.replace(/^﻿/, '');
  const sep = (texto.split('\n')[0].match(/;/g) || []).length > (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (q) { if (ch === '"' && texto[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { f.push(c); c = ''; }
    else if (ch === '\n') { f.push(c.replace(/\r$/, '')); filas.push(f); f = []; c = ''; }
    else c += ch;
  }
  if (c || f.length) { f.push(c); filas.push(f); }
  const [cab, ...resto] = filas.filter(x => x.some(v => v.trim()));
  return resto.map(x => Object.fromEntries(cab.map((k, i) => [k.trim(), (x[i] || '').trim()])));
}
const num = v => { v = String(v || '').replace(/[$\s]/g, ''); if (/,\d{1,2}$/.test(v)) v = v.replace(/\./g, '').replace(',', '.'); else v = v.replace(/,/g, ''); return Number(v) || 0; };
const pesos = n => '$ ' + Math.round(n).toLocaleString('es-AR');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

(async () => {
  const o = args();
  if (!o._[0] || !o.negocio || !o.salida) { console.error('Uso: node lista.js <catalogo.csv> --negocio "Nombre" [--anterior base.csv] [--telefono "..."] [--color "#12355b"] --salida <carpeta>'); process.exit(1); }
  const salida = path.resolve(o.salida);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La salida va fuera del repo, que es público.'); process.exit(1); }
  fs.mkdirSync(salida, { recursive: true });
  const items = csv(fs.readFileSync(o._[0], 'utf8')).filter(r => r.nombre && num(r.precio) > 0);
  const antes = o.anterior ? Object.fromEntries(csv(fs.readFileSync(o.anterior, 'utf8')).map(r => [r.codigo, num(r.precio)])) : {};
  const fecha = o.fecha || new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  const color = /^#[0-9a-f]{3,8}$/i.test(o.color || '') ? o.color : '#1d2a35';
  const rubros = {};
  for (const r of items) (rubros[cap(r.rubro || 'Otros')] = rubros[cap(r.rubro || 'Otros')] || []).push(r);
  const marca = r => { const a = antes[r.codigo]; if (!a) return ''; const p = num(r.precio); return p > a ? '▲' : p < a ? '▼' : ''; };
  const subieron = items.filter(r => marca(r) === '▲').length;

  const tabla = (lista) => `<table><tbody>${lista.map(r => `<tr><td class="cod">${esc(r.codigo)}</td><td>${esc(r.nombre)}${r.medida ? ` <b>${esc(r.medida)}</b>` : ''}${r.material ? `<small> · ${esc(r.material)}</small>` : ''}${r.unidad ? `<small> · ${esc(r.unidad)}</small>` : ''}</td><td class="p">${marca(r) ? `<i class="${marca(r) === '▲' ? 'sube' : 'baja'}">${marca(r)}</i> ` : ''}${pesos(num(r.precio))}</td></tr>`).join('')}</tbody></table>`;
  const html = (angosta) => `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Lista de precios · ${esc(o.negocio)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Red+Hat+Mono:wght@400;600&family=Work+Sans:wght@400;600;800&display=swap">
<style>
  @page{size:${angosta ? '110mm 240mm' : 'A4'};margin:${angosta ? '8mm 6mm' : '12mm 11mm'}}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font:${angosta ? '10.5px' : '9.5px'}/1.35 "Work Sans",system-ui,sans-serif;color:#1b1f23}
  header{border-bottom:3px solid ${color};padding-bottom:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-end;gap:8px;flex-wrap:wrap}
  h1{font-weight:800;font-size:${angosta ? '17px' : '20px'};color:${color}}
  header p{font:600 10px "Red Hat Mono",monospace;color:#4a525a}
  .cols{column-count:${angosta ? 1 : 2};column-gap:16px}
  section{break-inside:avoid-column;margin-bottom:8px}
  h2{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;background:${color};color:#fff;padding:3px 6px}
  table{width:100%;border-collapse:collapse}
  td{padding:2.5px 4px;border-bottom:1px solid #e3e6e8;vertical-align:top}
  tr{break-inside:avoid}
  td.cod{font:9px "Red Hat Mono",monospace;color:#5b636b;white-space:nowrap;width:1%}
  td.p{text-align:right;white-space:nowrap;font:600 ${angosta ? '11px' : '10px'} "Red Hat Mono",monospace}
  small{color:#5b636b} i{font-style:normal} .sube{color:#b42318} .baja{color:#1a7f37}
  footer{margin-top:8px;padding-top:5px;border-top:1px solid #c9ced3;font-size:9px;color:#4a525a}
</style></head><body>
<header><h1>${esc(o.negocio)} · Lista de precios</h1><p>Vigente desde el ${esc(fecha)}${subieron ? ` · ▲ ${subieron} con aumento` : ''}</p></header>
<div class="cols">${Object.entries(rubros).map(([rub, l]) => `<section><h2>${esc(rub)}</h2>${tabla(l)}</section>`).join('')}</div>
<footer>Precios en pesos, sujetos a cambio sin previo aviso.${o.telefono ? ' Pedidos y consultas por WhatsApp: ' + esc(o.telefono) + '.' : ''}</footer>
</body></html>`;

  const { chromium } = require('playwright');
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [nombre, angosta] of [['lista', false], ['lista-celular', true]]) {
    fs.writeFileSync(path.join(salida, nombre + '.html'), html(angosta));
    await p.goto('file://' + path.join(salida, nombre + '.html'), { waitUntil: 'load' }); await p.waitForTimeout(500);
    await p.pdf(Object.assign({ path: path.join(salida, nombre + '.pdf'), printBackground: true, preferCSSPageSize: true }, angosta ? { width: '110mm', height: '240mm' } : { format: 'A4' }));
  }
  await b.close();
  const txt = [`*${o.negocio}* · Lista de precios (vigente desde el ${fecha})`, '']
    .concat(...Object.entries(rubros).map(([rub, l]) => [`*${rub}*`, ...l.map(r => `• ${r.nombre}${r.medida ? ' ' + r.medida : ''}${r.unidad ? ' (' + r.unidad.toLowerCase() + ')' : ''}: ${pesos(num(r.precio))}${marca(r) ? ' ' + marca(r) : ''}`), '']))
    .concat(['Precios sujetos a cambio sin previo aviso.']).join('\n');
  fs.writeFileSync(path.join(salida, 'lista.txt'), txt + '\n');
  console.log(`${items.length} productos en ${Object.keys(rubros).length} rubros${o.anterior ? `, ${subieron} con aumento` : ''}. Archivos: ${['lista.pdf', 'lista-celular.pdf', 'lista.txt'].map(x => path.join(salida, x)).join(', ')}`);
})().catch(e => { console.error(e); process.exit(1); });
