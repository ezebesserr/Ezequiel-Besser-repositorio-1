// Fichas de propiedades para una inmobiliaria (idea NIC-01): PDF por propiedad y textos para portales, WhatsApp e Instagram.
// Uso: node fichas.js propiedades.csv inmobiliaria.json --salida <carpeta-privada>
// propiedades.csv: codigo, operacion, tipo, barrio, ubicacion, precio, moneda, expensas, ambientes, dormitorios, banos,
//   m2_cubiertos, m2_totales, cochera, antiguedad, destacados (separados por |), descripcion, fotos (rutas separadas por |),
//   ambientadas (números de las fotos con ambientación virtual, separados por |, contando desde 1).
// inmobiliaria.json: { "nombre", "corredor", "matricula", "telefono", "colores": { "marca", "acento" }, "fuentes": { "titulo", "texto" } }
// Las fotos con ambientación virtual llevan la leyenda estampada, y los textos lo avisan: nunca se muestra un mueble que no está
// sin decirlo. Sin matrícula del corredor no arma nada: en CABA y Provincia tiene que figurar en cada aviso.
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  return resto.map(x => Object.fromEntries(cab.map((k, i) => [k.trim().toLowerCase(), (x[i] || '').trim()])));
}
const miles = n => Number(String(n).replace(/\D/g, '')).toLocaleString('es-AR');

(async () => {
  const a = process.argv.slice(2), i = a.indexOf('--salida');
  if (a.length < 2 || i < 0) { console.error('Uso: node fichas.js propiedades.csv inmobiliaria.json --salida <carpeta-privada>'); process.exit(1); }
  const salida = path.resolve(a[i + 1]);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La salida va fuera del repo, que es público.'); process.exit(1); }
  const base = path.dirname(path.resolve(a[0]));
  const props = csv(fs.readFileSync(a[0], 'utf8'));
  const I = JSON.parse(fs.readFileSync(a[1], 'utf8'));
  if (!I.matricula || !I.corredor) { console.error('Falta el corredor responsable y su matrícula en inmobiliaria.json: tienen que figurar en cada aviso.'); process.exit(1); }
  const col = Object.assign({ marca: '#20332f', acento: '#c8553d' }, I.colores || {}), fu = Object.assign({ titulo: 'Fraunces', texto: 'Work Sans' }, I.fuentes || {});
  const fuentes = `https://fonts.googleapis.com/css2?family=${fu.titulo.replace(/ /g, '+')}:wght@600;800&family=${fu.texto.replace(/ /g, '+')}:wght@400;600&display=swap`;
  const { chromium } = require('playwright'); const b = await chromium.launch();
  const textos = [], avisos = [];
  for (const p of props) {
    const dir = path.join(salida, p.codigo || 'propiedad'); fs.mkdirSync(dir, { recursive: true });
    const fotos = (p.fotos || '').split('|').map(x => x.trim()).filter(Boolean).map((f, n) => {
      const r = path.resolve(base, f);
      if (!fs.existsSync(r)) { avisos.push(`${p.codigo}: no encuentro la foto ${f}`); return null; }
      return { src: 'data:image/' + (/\.png$/i.test(r) ? 'png' : 'jpeg') + ';base64,' + fs.readFileSync(r).toString('base64'), virtual: (p.ambientadas || '').split('|').map(Number).includes(n + 1) };
    }).filter(Boolean);
    const hayVirtual = fotos.some(f => f.virtual);
    const precio = p.precio ? `${p.moneda || 'USD'} ${miles(p.precio)}` : 'Consultar';
    const datos = [[p.ambientes, 'ambientes'], [p.dormitorios, 'dormitorios'], [p.banos, p.banos === '1' ? 'baño' : 'baños'], [p.m2_cubiertos, 'm² cubiertos'], [p.m2_totales, 'm² totales'], [p.cochera, 'cochera'], [p.antiguedad, 'años de antigüedad']].filter(x => x[0]);
    const titulo = `${p.tipo || 'Propiedad'} en ${p.operacion || 'venta'} · ${p.ambientes ? p.ambientes + ' amb. · ' : ''}${p.barrio || ''}`.trim();
    const destacados = (p.destacados || '').split('|').map(x => x.trim()).filter(Boolean);
    const foto = f => `<figure><img src="${f.src}" alt="">${f.virtual ? '<figcaption>Ambientación virtual</figcaption>' : ''}</figure>`;
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><link rel="stylesheet" href="${fuentes}"><style>
@page{size:A4;margin:0} *{box-sizing:border-box;margin:0;padding:0} body{width:794px;height:1123px;font:14px/1.45 "${fu.texto}",sans-serif;color:#1d2321;padding:34px 38px;position:relative}
.eti{font-weight:600;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${col.acento}} h1{font:800 30px/1.1 "${fu.titulo}",serif;color:${col.marca};margin:4px 0 2px}
.ub{color:#56605c} .precio{font:800 28px "${fu.titulo}",serif;color:${col.marca};margin:6px 0 12px} .precio small{font:400 13px "${fu.texto}",sans-serif;color:#56605c}
figure{position:relative;overflow:hidden;background:#e7ebe9} figure img{width:100%;height:100%;object-fit:cover;display:block}
figcaption{position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.72);color:#fff;font:600 11px "${fu.texto}",sans-serif;padding:3px 7px;letter-spacing:.03em}
.grande{height:330px} .grande figure{height:100%} .grilla{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px} .grilla figure{height:120px}
.cols{display:grid;grid-template-columns:230px 1fr;gap:22px;margin-top:16px} .datos{list-style:none;border-top:3px solid ${col.marca}} .datos li{padding:6px 0;border-bottom:1px solid #d9dfdc}
.datos b{font-size:17px} h2{font:600 16px "${fu.titulo}",serif;color:${col.marca};margin-bottom:6px} ul.dest{padding-left:18px;margin-bottom:8px}
.pie{position:absolute;left:38px;right:38px;bottom:30px;border-top:2px solid ${col.marca};padding-top:8px;display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#3c4542}
.nota{font-size:11.5px;color:#56605c;margin-top:8px}</style></head><body>
<p class="eti">${esc(p.operacion || '')} · Código ${esc(p.codigo || '')}</p><h1>${esc(titulo)}</h1><p class="ub">${esc([p.ubicacion, p.barrio].filter(Boolean).join(' · '))}</p>
<p class="precio">${esc(precio)}${p.expensas ? ` <small>+ expensas $ ${miles(p.expensas)}</small>` : ''}</p>
${fotos[0] ? `<div class="grande">${foto(fotos[0])}</div>` : ''}${fotos.length > 1 ? `<div class="grilla">${fotos.slice(1, 4).map(foto).join('')}</div>` : ''}
<div class="cols"><ul class="datos">${datos.map(d => `<li><b>${esc(d[0])}</b> ${esc(d[1])}</li>`).join('')}</ul>
<div>${destacados.length ? `<h2>Lo mejor</h2><ul class="dest">${destacados.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}<h2>Descripción</h2><p>${esc(p.descripcion || '')}</p>
${hayVirtual ? '<p class="nota">Las fotos marcadas tienen ambientación virtual: los muebles no están en la propiedad.</p>' : ''}</div></div>
<div class="pie"><span><b>${esc(I.nombre)}</b>${I.telefono ? ' · WhatsApp ' + esc(I.telefono) : ''}</span><span>Corredor responsable: ${esc(I.corredor)} · Mat. ${esc(I.matricula)}</span></div></body></html>`;
    const pg = await b.newPage({ viewport: { width: 794, height: 1123 } });
    await pg.setContent(html, { waitUntil: 'load' }); await pg.waitForTimeout(400);
    await pg.pdf({ path: path.join(dir, 'ficha.pdf'), format: 'A4', printBackground: true });
    await pg.screenshot({ path: path.join(dir, 'ficha.png') }); await pg.close();
    const virtual = hayVirtual ? '\n\nAlgunas fotos tienen ambientación virtual: los muebles no están en la propiedad.' : '';
    const ficha = datos.map(d => `${d[0]} ${d[1]}`).join(' · ');
    const t = {
      portal_titulo: titulo.slice(0, 70),
      portal_descripcion: `${p.descripcion || ''}\n\n${destacados.map(d => '• ' + d).join('\n')}\n\n${ficha}.${p.expensas ? ` Expensas: $ ${miles(p.expensas)}.` : ''}${virtual}\n\nCorredor responsable: ${I.corredor}, matrícula ${I.matricula}.`.trim(),
      whatsapp: `${titulo}\n${precio}${p.expensas ? ' + expensas' : ''}\n${ficha}\n${destacados.slice(0, 3).map(d => '• ' + d).join('\n')}${virtual}\nTe paso la ficha completa. ¿Querés coordinar una visita?`,
      instagram: `${titulo.toUpperCase()}\n\n${destacados.slice(0, 4).map(d => '✔ ' + d).join('\n')}\n\n${precio}. Escribinos para visitarla.${virtual}\n\n${I.nombre} · Mat. ${I.matricula}`
    };
    fs.writeFileSync(path.join(dir, 'textos.txt'), Object.entries(t).map(([k, v]) => `== ${k.replace('_', ' ')} ==\n${v}\n`).join('\n'));
    textos.push(p.codigo);
  }
  await b.close();
  avisos.forEach(x => console.log('Ojo: ' + x));
  console.log(`${textos.length} fichas en ${salida} (ficha.pdf, ficha.png y textos.txt por propiedad).`);
})().catch(e => { console.error(e); process.exit(1); });
