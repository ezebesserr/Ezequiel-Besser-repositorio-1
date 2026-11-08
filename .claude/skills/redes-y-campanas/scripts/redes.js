// Un mes de redes en un día (idea MKT-03): arma las piezas del mes con la identidad del local, los textos y el calendario.
// Uso: node redes.js redes.json --salida <carpeta-privada>
// redes.json: { "negocio", "mes": "diciembre de 2026", "usuario": "@cuenta",
//   "colores": { "fondo", "texto", "acento" }, "fuentes": { "titulo", "texto" } (de Google Fonts),
//   "publicaciones": [ { "fecha": "2026-12-01", "hora": "19:00", "tipo": "post|historia", "formato": "texto|oferta|foto",
//                        "destacado": "lo que se lee en la pieza", "detalle": "línea chica", "precio": "$ 25.000",
//                        "foto": "ruta a una foto PROPIA del local", "texto": "el texto de la publicación" } ] }
// Deja piezas/NN-fecha-tipo.png (1080×1080 o 1080×1920), textos.txt (para programar en Meta Business Suite) y
// calendario.pdf (el mes de un vistazo, para que el cliente apruebe). Sin foto propia, «foto» sale como «texto».
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

(async () => {
  const a = process.argv.slice(2), i = a.indexOf('--salida');
  if (!a[0] || i < 0) { console.error('Uso: node redes.js redes.json --salida <carpeta-privada>'); process.exit(1); }
  const salida = path.resolve(a[i + 1]);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La salida va fuera del repo, que es público.'); process.exit(1); }
  const base = path.dirname(path.resolve(a[0]));
  const R = JSON.parse(fs.readFileSync(a[0], 'utf8'));
  const col = Object.assign({ fondo: '#12355b', texto: '#ffffff', acento: '#ffc629' }, R.colores || {});
  const fu = Object.assign({ titulo: 'Barlow Condensed', texto: 'Barlow' }, R.fuentes || {});
  const familia = n => n.trim().replace(/ /g, '+');
  const fuentes = `https://fonts.googleapis.com/css2?family=${familia(fu.titulo)}:wght@600;700;800&family=${familia(fu.texto)}:wght@400;600&display=swap`;
  fs.mkdirSync(path.join(salida, 'piezas'), { recursive: true });
  const pubs = (R.publicaciones || []).slice().sort((x, y) => (x.fecha + (x.hora || '')).localeCompare(y.fecha + (y.hora || '')));
  const avisos = [];

  const pieza = (p, n) => {
    const alto = p.tipo === 'historia' ? 1920 : 1080;
    let formato = p.formato || 'texto', foto = '';
    if (formato === 'foto') {
      const f = p.foto && path.resolve(base, p.foto);
      if (f && fs.existsSync(f)) foto = 'data:image/' + (/\.png$/i.test(f) ? 'png' : 'jpeg') + ';base64,' + fs.readFileSync(f).toString('base64');
      else { formato = 'texto'; avisos.push(`${p.fecha}: falta la foto propia (${p.foto || 'sin ruta'}); salió como texto. Pedísela al cliente.`); }
    }
    const invertido = formato === 'texto' && n % 2 === 1; // alterna fondo y acento para que el feed no sea un bloque igual
    const fondo = invertido ? col.acento : col.fondo, tinta = invertido ? col.fondo : col.texto;
    const escala = p.tipo === 'historia' ? 1.3 : 1; // la historia se ve de cerca y en vertical: letra más grande
    const grande = Math.round(((p.destacado || '').length > 60 ? 84 : (p.destacado || '').length > 30 ? 104 : 132) * escala);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="${fuentes}"><style>
*{box-sizing:border-box;margin:0;padding:0} body{width:1080px;height:${alto}px;overflow:hidden;background:${fondo};color:${tinta};font-family:"${fu.texto}",system-ui,sans-serif;position:relative}
.foto{position:absolute;inset:0;background:url("${foto}") center/cover} .franja{position:absolute;left:0;right:0;bottom:0;background:${col.fondo};color:${col.texto};padding:56px 72px 64px}
.caja{position:absolute;inset:0;padding:${p.tipo === 'historia' ? '260px 88px' : '96px 88px'};display:flex;flex-direction:column;justify-content:center;gap:28px}
h1{font-family:"${fu.titulo}",sans-serif;font-weight:800;font-size:${grande}px;line-height:.98;letter-spacing:-.01em;text-transform:uppercase}
.det{font-size:${Math.round(38 * escala)}px;line-height:1.25;max-width:880px;opacity:.92} .precio{font-family:"${fu.titulo}",sans-serif;font-weight:800;font-size:150px;line-height:1;color:${col.acento}}
.firma{position:absolute;left:88px;right:88px;bottom:${p.tipo === 'historia' ? 200 : 64}px;display:flex;justify-content:space-between;font:600 30px "${fu.texto}",sans-serif;letter-spacing:.04em;opacity:.9}
.raya{width:140px;height:12px;background:${formato === 'oferta' ? col.acento : tinta}}
</style></head><body>${formato === 'foto'
      ? `<div class="foto"></div><div class="franja"><h1 style="font-size:${Math.min(grande, 96)}px">${esc(p.destacado)}</h1>${p.detalle ? `<p class="det" style="margin-top:18px">${esc(p.detalle)}</p>` : ''}</div>`
      : `<div class="caja"><div class="raya"></div><h1>${esc(p.destacado)}</h1>${formato === 'oferta' && p.precio ? `<p class="precio">${esc(p.precio)}</p>` : ''}${p.detalle ? `<p class="det">${esc(p.detalle)}</p>` : ''}</div>
<div class="firma"><span>${esc(R.negocio || '')}</span><span>${esc(R.usuario || '')}</span></div>`}</body></html>`;
  };

  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const archivos = [];
  for (let n = 0; n < pubs.length; n++) {
    const p = pubs[n], alto = p.tipo === 'historia' ? 1920 : 1080;
    const pg = await b.newPage({ viewport: { width: 1080, height: alto } });
    await pg.setContent(pieza(p, n), { waitUntil: 'load' }); await pg.waitForTimeout(400);
    const nombre = `${String(n + 1).padStart(2, '0')}-${p.fecha}-${p.tipo === 'historia' ? 'historia' : 'post'}.png`;
    await pg.screenshot({ path: path.join(salida, 'piezas', nombre) }); await pg.close();
    archivos.push(nombre);
  }
  const dia = f => new Date(f + 'T12:00:00Z').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  fs.writeFileSync(path.join(salida, 'textos.txt'), pubs.map((p, n) => `#${n + 1} · ${dia(p.fecha)}${p.hora ? ' · ' + p.hora : ''} · ${p.tipo === 'historia' ? 'historia' : 'publicación'} · pieza ${archivos[n]}\n${p.texto || ''}\n`).join('\n'));

  // Calendario del mes para aprobar: una grilla de lunes a domingo con la miniatura de cada día.
  const fechas = pubs.map(p => p.fecha).sort();
  const d0 = new Date(fechas[0] + 'T12:00:00Z'), anio = d0.getUTCFullYear(), mes = d0.getUTCMonth();
  const primero = new Date(Date.UTC(anio, mes, 1, 12)), dias = new Date(Date.UTC(anio, mes + 1, 0, 12)).getUTCDate();
  const offset = (primero.getUTCDay() + 6) % 7;
  const celdas = [];
  for (let k = 0; k < offset; k++) celdas.push('<div class="v"></div>');
  for (let d = 1; d <= dias; d++) {
    const f = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const del = pubs.map((p, n) => [p, n]).filter(([p]) => p.fecha === f);
    celdas.push(`<div class="d"><b>${d}</b>${del.map(([p, n]) => `<img src="data:image/png;base64,${fs.readFileSync(path.join(salida, 'piezas', archivos[n])).toString('base64')}" class="${p.tipo === 'historia' ? 'h' : ''}" alt="">`).join('')}</div>`);
  }
  const cal = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;margin:0}
body{font:11px system-ui,sans-serif;color:#1b1f23} h1{font-size:18px;margin-bottom:6px} .g{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.s{font-weight:700;text-transform:uppercase;font-size:9px;color:#56606a} .d{border:1px solid #d3d8dc;min-height:64px;padding:3px;display:flex;flex-wrap:wrap;gap:3px;align-content:flex-start}
.d b{width:100%;font-size:10px} img{width:44px;height:44px;object-fit:cover} img.h{width:25px;height:44px} .v{min-height:64px}</style></head><body>
<h1>${esc(R.negocio || '')} · Redes de ${esc(R.mes || '')} · ${pubs.filter(p => p.tipo !== 'historia').length} publicaciones y ${pubs.filter(p => p.tipo === 'historia').length} historias</h1>
<div class="g">${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(x => `<div class="s">${x}</div>`).join('')}${celdas.join('')}</div></body></html>`;
  const pg = await b.newPage(); await pg.setContent(cal, { waitUntil: 'load' });
  await pg.pdf({ path: path.join(salida, 'calendario.pdf'), format: 'A4', landscape: true, printBackground: true });
  await b.close();
  avisos.forEach(x => console.log('Ojo: ' + x));
  console.log(`${archivos.length} piezas en ${path.join(salida, 'piezas')}, textos.txt y calendario.pdf.`);
})().catch(e => { console.error(e); process.exit(1); });
