// Arma todo lo que hace falta para lanzar un taller, desde un solo archivo de datos:
//   afiche.pdf + afiche.png (A4, con QR que abre WhatsApp para anotarse), posteo.png (1080×1080),
//   historia.png (1080×1920), propuesta.pdf (para cámaras y centros comerciales) y, si se pasa la
//   lista de asistentes, constancias.pdf (una hoja por persona).
//
// Uso: node kit.js taller.json carpeta-salida [--asistentes asistentes.csv] [--dolar 1575]
//
// taller.json: ver .claude/skills/talleres-ia/ejemplo/taller.json. Lo que falte sale resaltado como «a confirmar».
// asistentes.csv: una persona por renglón, «nombre,comercio» (con o sin encabezado).
// La salida va FUERA del repo: la lista de asistentes es privada.
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');

const PROGRAMA = [
  ['15\'', 'Qué hace bien la IA, en qué se equivoca y qué no cargarle nunca.'],
  ['45\'', 'WhatsApp Business con IA: lo configurás en tu celular, con tu catálogo.'],
  ['10\'', 'Pausa y café.'],
  ['30\'', 'Contestar consultas y reseñas en un minuto, con tus datos reales.'],
  ['30\'', 'Presupuestos y listas de precios ordenadas, sin errores en las cuentas.'],
  ['30\'', 'Las publicaciones del mes con fotos de tu local.'],
  ['20\'', 'Tu plan de siete días y preguntas.']
];
const LLEVAS = [
  'El WhatsApp del negocio configurado, con catálogo y respuestas rápidas.',
  'Tus reseñas de Google respondidas y una forma de pedir más.',
  'Un presupuesto modelo para mandar en dos minutos.',
  'Las publicaciones del mes, con fotos de tu local.'
];

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
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
function leerPrecios() {
  const md = fs.readFileSync(path.join(REPO, 'creador/negocio/precios.md'), 'utf8');
  const fila = n => { const m = new RegExp('^\\|\\s*' + n + '\\s*\\|[^|]*\\|\\s*(\\d+)\\s*\\|', 'm').exec(md); return m ? Number(m[1]) : null; };
  const ref = /Dólar oficial de referencia:\s*\$([\d.]+)\s*\(([^)]*)\)/.exec(md);
  return { abierto: fila('Taller abierto'), cerrado: fila('Taller cerrado'), whatsapp: fila('WhatsApp Business configurado'), dolarRef: ref ? Number(ref[1].replace(/\./g, '')) : null, dolarRefTxt: ref ? ref[2] : '' };
}
async function dolarDelDia() {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const j = await (await fetch('https://dolarapi.com/v1/dolares/oficial', { signal: ctl.signal })).json(); clearTimeout(t);
    if (j && j.venta) return Number(j.venta);
  } catch (e) { /* sin red */ }
  return null;
}
function pesos(n) { return '$ ' + (Math.round(n / 1000) * 1000).toLocaleString('es-AR'); }

const FUENTES = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Cabin+Sketch:wght@700&display=swap">';
const BASE_CSS = `
  :root{--pizarra:#22332b;--pizarra-2:#2e4439;--madera:#7a4f27;--madera-2:#5c3a1b;--tiza:#f2f0e8;--tiza-am:#f0cf62;--tiza-gris:#c3cec8;--tinta:#1c2420;--gris:#55605a;--linea:#d6dcd8;
    --f-tiza:"Cabin Sketch","Comic Sans MS",cursive;--f-txt:"Atkinson Hyperlegible",system-ui,sans-serif}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:var(--f-txt);color:var(--tiza);background:var(--pizarra)}
  .falta{background:#fff2b8;color:var(--tinta);padding:0 6px;border-radius:3px}
  .pizarron{background:radial-gradient(120% 90% at 30% 20%,var(--pizarra-2),var(--pizarra) 60%);border:22px solid var(--madera);box-shadow:inset 0 0 0 3px var(--madera-2),inset 0 0 120px rgba(0,0,0,.35)}
  h1{font-family:var(--f-tiza);font-weight:700;letter-spacing:.01em;line-height:1.02}
  h1 em{font-style:normal;color:var(--tiza-am)}
  .etq{font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--tiza-am)}`;

function pagina(titulo, css, cuerpo) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>${FUENTES}<style>${BASE_CSS}${css}</style></head><body>${cuerpo}</body></html>`;
}

(async () => {
  const a = process.argv.slice(2);
  const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
  const opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : null; };
  if (pos.length < 2) { console.error('Uso: node kit.js taller.json carpeta-salida [--asistentes asistentes.csv] [--dolar 1575]'); process.exit(1); }
  const salida = path.resolve(pos[1]);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La carpeta de salida está dentro del repo, que es público. Usá una carpeta privada.'); process.exit(1); }
  const T = JSON.parse(fs.readFileSync(pos[0], 'utf8'));
  const faltan = [];
  const v = (k, nombre) => { const x = T[k]; if (x === undefined || x === null || String(x).trim() === '') { faltan.push(nombre || k); return `<span class="falta">${esc(nombre || k)}: a confirmar</span>`; } return esc(x); };
  const titulo = T.titulo || 'IA para tu comercio, en una tarde';
  const tituloHtml = esc(titulo).replace(/,\s*(.+)$/, ', <em>$1</em>');
  const num = waNumero(T.inscripcion_whatsapp);
  const textoInsc = T.inscripcion_mensaje || `Hola, quiero anotarme al taller «${titulo}»${T.fecha ? ' del ' + T.fecha : ''}.`;
  const linkInsc = num ? `https://wa.me/${num}?text=${encodeURIComponent(textoInsc)}` : (T.link || '');
  if (!num) faltan.push('WhatsApp de inscripción (inscripcion_whatsapp)');

  let qr = '';
  try {
    const QR = require('qrcode');
    if (linkInsc) qr = await QR.toString(linkInsc, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#1c2420', light: '#ffffff' } });
  } catch (e) { console.log('AVISO: sin la librería qrcode el afiche sale sin QR (instalala con: npm install -g qrcode).'); }

  const P = leerPrecios();
  let dolar = opt('dolar') ? Number(opt('dolar')) : await dolarDelDia();
  let fuenteDolar = opt('dolar') ? 'dólar oficial cargado a mano' : 'dólar oficial del día';
  if (!dolar) { dolar = P.dolarRef; fuenteDolar = 'dólar oficial de referencia (' + P.dolarRefTxt + ')'; console.log('AVISO: no pude traer el dólar del día; la propuesta usa la referencia de precios.md. Pasá --dolar.'); }

  const datos = `
    <div class="d"><span class="etq">Cuándo</span><b>${v('fecha')}${T.horario ? ', ' + esc(T.horario) : ''}</b></div>
    <div class="d"><span class="etq">Dónde</span><b>${v('lugar')}${T.direccion ? '<br><small>' + esc(T.direccion) + '</small>' : ''}</b></div>
    <div class="d"><span class="etq">Valor</span><b>${v('valor')}</b></div>
    <div class="d"><span class="etq">Cupo</span><b>${esc(T.cupo || 15)} personas</b></div>`;
  const programa = PROGRAMA.map(p => `<li><span>${p[0]}</span>${esc(p[1])}</li>`).join('');
  const docente = `${esc(T.docente || 'Ezequiel Besser')} · ${esc(T.presentacion || 'Estudiante de Ingeniería en el ITBA')}`;

  // Afiche A4
  const afiche = pagina('Afiche', `
    html,body{width:794px;height:1123px}
    .pizarron{width:794px;height:1123px;padding:46px 48px;display:flex;flex-direction:column;gap:22px}
    .sup{display:flex;justify-content:space-between;gap:12px;font-size:16px}
    h1{font-size:76px}
    .bajada{font-size:22px;line-height:1.4;color:#dfe6e1;max-width:30ch}
    .datos{display:grid;grid-template-columns:1fr 1fr;gap:14px 26px}
    .d{border-bottom:1px dashed rgba(242,240,232,.3);padding-bottom:8px;display:grid;gap:2px;font-size:20px}
    .d .etq{font-size:13px} .d small{font-weight:400;font-size:16px;color:var(--tiza-gris)}
    .prog h2{font:700 30px/1 var(--f-tiza);color:var(--tiza-am);margin-bottom:8px}
    .prog ol{list-style:none;display:grid;gap:5px;font-size:17px}
    .prog li{display:grid;grid-template-columns:52px 1fr;gap:8px}
    .prog li span{font:700 20px/1.1 var(--f-tiza)}
    .pie{margin-top:auto;display:flex;gap:22px;align-items:center}
    .qr{width:170px;height:170px;background:#fff;padding:8px;border-radius:6px;flex:none}
    .qr svg{width:100%;height:100%;display:block}
    .insc b{display:block;font:700 34px/1.05 var(--f-tiza);color:var(--tiza-am)}
    .insc p{font-size:18px;margin-top:6px}
    .insc small{display:block;margin-top:10px;font-size:15px;color:var(--tiza-gris)}`,
    `<div class="pizarron">
      <div class="sup"><span class="etq">Taller presencial${T.zona ? ' · ' + esc(T.zona) : ''}</span>${T.socio ? `<span class="etq">Con ${esc(T.socio)}</span>` : ''}</div>
      <h1>${tituloHtml}</h1>
      <p class="bajada">Tres horas con tu propio celular. Te vas con el WhatsApp del negocio configurado, las reseñas respondidas y las publicaciones del mes listas.</p>
      <div class="datos">${datos}</div>
      <div class="prog"><h2>Hoy en el taller</h2><ol>${programa}</ol></div>
      <div class="pie">${qr ? `<div class="qr">${qr}</div>` : ''}<div class="insc"><b>Anotate por WhatsApp</b><p>${num ? esc(T.inscripcion_whatsapp) : '<span class="falta">número a confirmar</span>'}${qr ? ' · o escaneá el código' : ''}</p><small>${docente}</small></div></div>
    </div>`);

  // Posteo cuadrado
  const posteo = pagina('Posteo', `
    html,body{width:1080px;height:1080px}
    .pizarron{width:1080px;height:1080px;padding:70px 76px;display:flex;flex-direction:column;gap:34px}
    h1{font-size:118px}
    .bajada{font-size:34px;line-height:1.35;color:#dfe6e1}
    .datos{display:grid;grid-template-columns:1fr 1fr;gap:20px 40px;margin-top:auto}
    .d{display:grid;gap:4px;font-size:32px;border-bottom:2px dashed rgba(242,240,232,.3);padding-bottom:12px}
    .d .etq{font-size:20px} .d small{font-size:24px;font-weight:400;color:var(--tiza-gris)}
    .insc{font:700 46px/1.1 var(--f-tiza);color:var(--tiza-am)}`,
    `<div class="pizarron"><span class="etq" style="font-size:24px">Taller presencial${T.zona ? ' · ' + esc(T.zona) : ''}</span><h1>${tituloHtml}</h1>
      <p class="bajada">Tres horas con tu celular: WhatsApp configurado, reseñas respondidas y las publicaciones del mes.</p>
      <div class="datos">${datos}</div>
      <p class="insc">Anotate por WhatsApp: ${num ? esc(T.inscripcion_whatsapp) : '<span class="falta">número a confirmar</span>'}</p></div>`);

  // Historia vertical
  const historia = pagina('Historia', `
    html,body{width:1080px;height:1920px}
    .pizarron{width:1080px;height:1920px;padding:140px 80px 160px;display:flex;flex-direction:column;gap:46px}
    h1{font-size:132px}
    ul{list-style:none;display:grid;gap:22px;font-size:40px;line-height:1.3}
    li{padding-left:56px;position:relative} li::before{content:"✓";position:absolute;left:0;color:var(--tiza-am);font-family:var(--f-tiza)}
    .datos{display:grid;gap:22px;margin-top:auto}
    .d{display:grid;gap:4px;font-size:40px;border-bottom:2px dashed rgba(242,240,232,.3);padding-bottom:14px}
    .d .etq{font-size:24px} .d small{font-size:30px;font-weight:400;color:var(--tiza-gris)}
    .insc{font:700 58px/1.1 var(--f-tiza);color:var(--tiza-am)}`,
    `<div class="pizarron"><span class="etq" style="font-size:28px">Taller presencial${T.zona ? ' · ' + esc(T.zona) : ''}</span><h1>${tituloHtml}</h1>
      <ul>${LLEVAS.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="datos">${datos}</div>
      <p class="insc">Anotate: ${num ? esc(T.inscripcion_whatsapp) : '<span class="falta">número a confirmar</span>'}</p></div>`);

  // Propuesta para cámaras y centros comerciales
  const cerradoUsd = P.cerrado, abiertoUsd = P.abierto;
  const propuesta = pagina('Propuesta', `
    body{background:#fff;color:var(--tinta)}
    .hoja{width:794px;min-height:1123px;padding:0 0 40px}
    .banda{background:var(--pizarra);color:var(--tiza);border-bottom:10px solid var(--madera);padding:34px 48px 30px}
    .banda h1{font-size:54px}
    .banda p{margin-top:10px;font-size:18px;color:#dfe6e1;max-width:56ch}
    .cuerpo{padding:26px 48px 0;display:grid;gap:20px;font-size:16.5px;line-height:1.5}
    h2{font:700 26px/1.1 var(--f-tiza);color:var(--pizarra);margin-bottom:6px}
    .dos{display:grid;grid-template-columns:1fr 1fr;gap:22px}
    ul,ol{padding-left:1.15em} li{margin:3px 0}
    .prog{list-style:none;padding:0}
    .prog li{display:grid;grid-template-columns:46px 1fr;gap:6px}
    .prog li span{font:700 18px/1.3 var(--f-tiza);color:var(--pizarra)}
    table{border-collapse:collapse;width:100%}
    td,th{padding:8px 6px;border-bottom:1px solid var(--linea);text-align:left;vertical-align:top}
    th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--gris)}
    td.n{text-align:right;white-space:nowrap;font-weight:700}
    .nota{font-size:14px;color:var(--gris)}
    .firma{border-top:2px solid var(--pizarra);padding-top:12px}`,
    `<div class="hoja"><div class="banda"><span class="etq">Propuesta${T.socio ? ' para ' + esc(T.socio) : ' para cámaras y centros comerciales'}</span><h1>${tituloHtml}</h1>
      <p>Un taller práctico de tres horas para que los comerciantes de la zona usen inteligencia artificial en su negocio, con su propio celular y sobre sus propios clientes.</p></div>
      <div class="cuerpo">
        <div class="dos">
          <div><h2>Qué se llevan los socios</h2><ul>${LLEVAS.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div><h2>El programa</h2><ol class="prog">${programa}</ol></div>
        </div>
        <div><h2>Formatos y valores</h2>
          <table><thead><tr><th>Formato</th><th>Qué incluye</th><th>Valor</th></tr></thead><tbody>
            <tr><td>Taller cerrado</td><td>Para sus socios, en su sede, hasta 20 personas, con ejemplos de los rubros de la zona.</td><td class="n">${cerradoUsd ? 'USD ' + cerradoUsd + '<br>' + pesos(cerradoUsd * dolar) : 'a confirmar'}</td></tr>
            <tr><td>Taller abierto</td><td>Lo difunden ustedes y cada socio paga su lugar; sus socios tienen un precio especial.</td><td class="n">${abiertoUsd ? 'USD ' + abiertoUsd + ' por persona<br>' + pesos(abiertoUsd * dolar) : 'a confirmar'}</td></tr>
          </tbody></table>
          <p class="nota">Valores en pesos al ${esc(fuenteDolar)} ($ ${dolar ? dolar.toLocaleString('es-AR') : '—'} por dólar), redondeados a miles y válidos por 15 días.</p></div>
        <div class="dos">
          <div><h2>Qué necesitamos de ustedes</h2><ul><li>Un salón con wifi y enchufes para 15 a 20 personas.</li><li>Difundirlo entre los socios con el afiche y el posteo que les mandamos hechos.</li><li>Elegir la fecha fuera del horario comercial.</li></ul></div>
          <div><h2>Quién lo da</h2><p>${docente}. Da clases particulares de Matemática, Física y Química y arma páginas web para comercios de la zona.</p>${T.link ? `<p class="nota">Más detalles: ${esc(T.link)}</p>` : ''}</div>
        </div>
        <div class="firma"><b>${esc(T.docente || 'Ezequiel Besser')}</b> · WhatsApp ${num ? esc(T.inscripcion_whatsapp) : '<span class="falta">a confirmar</span>'}${T.mail ? ' · ' + esc(T.mail) : ''}</div>
      </div></div>`);

  // Constancias
  let constancias = null, nAsist = 0;
  const csvPath = opt('asistentes');
  if (csvPath) {
    const filas = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      .map(l => l.split(l.includes(';') ? ';' : ',').map(x => x.trim().replace(/^"|"$/g, '')))
      .filter(f => f[0] && !/^nombre$/i.test(f[0]));
    nAsist = filas.length;
    constancias = pagina('Constancias', `
      @page{size:A4 landscape;margin:0}
      body{background:#fff;color:var(--tinta)}
      .c{width:1123px;height:794px;padding:56px;page-break-after:always;display:flex}
      .marco{flex:1;border:14px solid var(--pizarra);outline:3px solid var(--madera);outline-offset:-24px;padding:70px 80px;display:flex;flex-direction:column;gap:26px;justify-content:center}
      .marco h1{font-size:62px;color:var(--pizarra)}
      .marco p{font-size:24px;line-height:1.5;max-width:52ch}
      .marco b.n{font:700 46px/1.1 var(--f-tiza);color:var(--pizarra);display:block}
      .firma{margin-top:30px;border-top:2px solid var(--tinta);width:340px;padding-top:8px;font-size:18px}`,
      filas.map(f => `<section class="c"><div class="marco"><span class="etq" style="color:var(--madera)">Taller «${esc(titulo)}»</span><h1>Constancia de participación</h1>
        <p>Se deja constancia de que</p><b class="n">${esc(f[0])}</b>
        <p>${f[1] ? 'de ' + esc(f[1]) + ' ' : ''}participó del taller práctico de tres horas «${esc(titulo)}»${T.fecha ? ', el ' + esc(T.fecha) : ''}${T.lugar ? ', en ' + esc(T.lugar) : ''}.</p>
        <div class="firma">${esc(T.docente || 'Ezequiel Besser')}<br><small>${esc(T.presentacion || 'Estudiante de Ingeniería en el ITBA')}</small></div></div></section>`).join(''));
  }

  fs.mkdirSync(salida, { recursive: true });
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  async function render(nombre, html, w, h, tipo) {
    const f = path.join(salida, nombre + '.html'); fs.writeFileSync(f, html);
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + f, { waitUntil: 'load' }); await p.waitForTimeout(700);
    if (tipo.includes('png')) await p.screenshot({ path: path.join(salida, nombre + '.png'), clip: { x: 0, y: 0, width: w, height: h } });
    if (tipo.includes('pdf')) await p.pdf({ path: path.join(salida, nombre + '.pdf'), width: w + 'px', height: h + 'px', printBackground: true, pageRanges: '' });
    if (tipo.includes('pdf-a4')) { }
    await p.close();
  }
  await render('afiche', afiche, 794, 1123, 'png pdf');
  await render('posteo', posteo, 1080, 1080, 'png');
  await render('historia', historia, 1080, 1920, 'png');
  const fp = path.join(salida, 'propuesta.html'); fs.writeFileSync(fp, propuesta);
  let pg = await b.newPage(); await pg.goto('file://' + fp, { waitUntil: 'load' }); await pg.waitForTimeout(700);
  await pg.pdf({ path: path.join(salida, 'propuesta.pdf'), format: 'A4', printBackground: true }); await pg.close();
  if (constancias) {
    const fc = path.join(salida, 'constancias.html'); fs.writeFileSync(fc, constancias);
    pg = await b.newPage(); await pg.goto('file://' + fc, { waitUntil: 'load' }); await pg.waitForTimeout(700);
    await pg.pdf({ path: path.join(salida, 'constancias.pdf'), format: 'A4', landscape: true, printBackground: true }); await pg.close();
  }
  await b.close();
  const hechos = ['afiche.pdf', 'afiche.png', 'posteo.png', 'historia.png', 'propuesta.pdf'].concat(constancias ? ['constancias.pdf'] : []);
  console.log('Listo: ' + hechos.map(x => path.join(salida, x)).join(', '));
  if (constancias) console.log(`Constancias: ${nAsist}.`);
  if (linkInsc && num) console.log('Link de inscripción (va en el QR): ' + linkInsc);
  if (faltan.length) console.log('A confirmar (sale resaltado): ' + [...new Set(faltan)].join(', ') + '.');
})().catch(e => { console.error(e); process.exit(1); });
