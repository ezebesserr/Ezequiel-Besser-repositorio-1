// Informe de visibilidad en IA para comercios de afuera (idea EXT-05): qué responden ChatGPT, Gemini y Google con IA
// cuando un cliente pregunta por su rubro y su barrio, cómo están su ficha y su web, y las acciones para mejorar.
// Uso: node visibilidad.js datos.json --salida <carpeta-privada>
// datos.json: mirá ejemplo/visibilidad.json. "idioma": "es" o "en". Los resultados los anota quien hizo la prueba:
// el script no consulta a los asistentes ni inventa nada.
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const T = {
  es: { eti: 'Auditoría de visibilidad en IA', titulo: n => `¿Le recomiendan ${n} los asistentes con IA?`, aparece: (a, t) => `Aparece en ${a} de ${t} respuestas`,
    pregunta: 'Pregunta (como la haría un cliente)', citados: 'Recomiendan en su lugar', ficha: 'Ficha de Google', web: 'Web', acciones: 'Qué haríamos, en orden',
    estados: { bien: 'Bien', mal: 'Falta', revisar: 'Revisar' }, si: 'Sí', no: 'No', metodo: 'Cómo se hizo la prueba', firma: 'Preparado por' },
  en: { eti: 'AI visibility audit', titulo: n => `Do AI assistants recommend ${n}?`, aparece: (a, t) => `Shows up in ${a} of ${t} answers`,
    pregunta: 'Question (as a customer would ask it)', citados: 'Recommended instead', ficha: 'Google Business Profile', web: 'Website', acciones: 'What we would do, in order',
    estados: { bien: 'OK', mal: 'Missing', revisar: 'Check' }, si: 'Yes', no: 'No', metodo: 'How we tested', firma: 'Prepared by' }
};

(async () => {
  const a = process.argv.slice(2), i = a.indexOf('--salida');
  if (!a[0] || i < 0) { console.error('Uso: node visibilidad.js datos.json --salida <carpeta-privada>'); process.exit(1); }
  const salida = path.resolve(a[i + 1]);
  if (salida === REPO || salida.startsWith(REPO + path.sep)) { console.error('La salida va fuera del repo, que es público.'); process.exit(1); }
  fs.mkdirSync(salida, { recursive: true });
  const D = JSON.parse(fs.readFileSync(a[0], 'utf8')), t = T[D.idioma === 'en' ? 'en' : 'es'];
  const asis = D.asistentes || ['ChatGPT', 'Gemini', 'Google'];
  const preg = D.preguntas || [];
  let total = 0, aparece = 0;
  preg.forEach(p => asis.forEach(x => { const v = (p.resultados || {})[x]; if (v != null) { total++; if (/^(s[ií]|yes|aparece|\d)/i.test(String(v))) aparece++; } }));
  const citados = {};
  preg.forEach(p => (p.citados || []).forEach(c => { citados[c] = (citados[c] || 0) + 1; }));
  const top = Object.entries(citados).sort((x, y) => y[1] - x[1]).slice(0, 5);
  const celda = v => v == null ? '<td class="n">—</td>' : /^(s[ií]|yes|aparece|\d)/i.test(String(v)) ? `<td class="s">${esc(/^\d/.test(String(v)) ? '#' + v : t.si)}</td>` : `<td class="x">${t.no}</td>`;
  const checks = l => (l || []).map(c => `<li class="${esc(c.estado)}"><b>${esc(t.estados[c.estado] || c.estado)}</b> ${esc(c.punto)}${c.nota ? `<span>${esc(c.nota)}</span>` : ''}</li>`).join('');
  const html = `<!DOCTYPE html><html lang="${D.idioma === 'en' ? 'en' : 'es'}"><head><meta charset="UTF-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Serif:wght@600&family=IBM+Plex+Mono:wght@500&display=swap"><style>
@page{size:A4;margin:0} *{box-sizing:border-box;margin:0;padding:0} body{font:13.5px/1.45 "IBM Plex Sans",sans-serif;color:#1c1f24}
.pag{width:794px;height:1123px;padding:42px 46px;position:relative;break-after:page;overflow:hidden}
.eti{font:500 11px "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#5a6270} h1{font:600 30px/1.1 "IBM Plex Serif",serif;margin:6px 0 4px}
.sub{color:#5a6270} .gran{display:flex;align-items:baseline;gap:14px;margin:22px 0 14px;padding:16px 18px;background:#f1efe9;border-left:6px solid #b3261e}
.gran b{font:600 46px "IBM Plex Serif",serif;color:#b3261e} table{width:100%;border-collapse:collapse;margin-top:8px} th,td{padding:7px 8px;border-bottom:1px solid #dcdfe4;text-align:left;vertical-align:top}
th{font:500 10.5px "IBM Plex Mono",monospace;text-transform:uppercase;letter-spacing:.05em;color:#5a6270} td.s{color:#1a7f37;font-weight:600} td.x{color:#b3261e;font-weight:600} td.n{color:#9aa1ab}
h2{font:600 18px "IBM Plex Serif",serif;margin:22px 0 6px} ul{list-style:none} li{padding:7px 0;border-bottom:1px solid #dcdfe4} li b{display:inline-block;min-width:66px;font-size:11.5px;text-transform:uppercase}
li.bien b{color:#1a7f37} li.mal b{color:#b3261e} li.revisar b{color:#9a5b00} li span{display:block;color:#5a6270;margin-left:66px} ol{padding-left:20px} ol li{border:0;padding:4px 0}
.cit{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px} .cit span{background:#f1efe9;padding:3px 8px;border-radius:2px;font-size:12.5px}
.pie{position:absolute;left:46px;right:46px;bottom:34px;font-size:11.5px;color:#5a6270;border-top:1px solid #c9ced6;padding-top:8px}</style></head><body>
<section class="pag"><p class="eti">${t.eti} · ${esc(D.fecha || '')}</p><h1>${esc(t.titulo(D.negocio))}</h1><p class="sub">${esc([D.rubro, D.ciudad].filter(Boolean).join(' · '))}</p>
<div class="gran"><b>${aparece}/${total}</b><span>${esc(t.aparece(aparece, total))}</span></div>
<table><thead><tr><th>${t.pregunta}</th>${asis.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>
${preg.map(p => `<tr><td>${esc(p.texto)}</td>${asis.map(x => celda((p.resultados || {})[x])).join('')}</tr>`).join('')}</tbody></table>
${top.length ? `<h2>${t.citados}</h2><div class="cit">${top.map(([c, n]) => `<span>${esc(c)} · ${n}</span>`).join('')}</div>` : ''}
<p class="pie">${t.metodo}: ${esc(D.metodo || '')}</p></section>
<section class="pag"><h2 style="margin-top:0">${t.ficha}</h2><ul>${checks(D.ficha)}</ul><h2>${t.web}</h2><ul>${checks(D.web)}</ul>
<h2>${t.acciones}</h2><ol>${(D.acciones || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
<p class="pie">${t.firma}: ${esc(D.firma || '')}${D.contacto ? ' · ' + esc(D.contacto) : ''}</p></section></body></html>`;
  fs.writeFileSync(path.join(salida, 'informe.html'), html);
  const { chromium } = require('playwright'); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
  await p.goto('file://' + path.join(salida, 'informe.html'), { waitUntil: 'load' }); await p.waitForTimeout(600);
  await p.pdf({ path: path.join(salida, 'informe.pdf'), format: 'A4', printBackground: true });
  await p.screenshot({ path: path.join(salida, 'informe.png'), clip: { x: 0, y: 0, width: 794, height: 1123 } });
  await b.close();
  console.log(`${D.negocio}: aparece en ${aparece} de ${total} respuestas. Informe: ${path.join(salida, 'informe.pdf')}`);
})().catch(e => { console.error(e); process.exit(1); });
