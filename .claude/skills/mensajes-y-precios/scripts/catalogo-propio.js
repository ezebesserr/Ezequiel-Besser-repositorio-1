// Kit para el WhatsApp Business del taller: una tarjeta por servicio para el catálogo y todos los textos.
// Lee los servicios y precios de creador/negocio/precios.md y la firma de creador/negocio/perfil.md.
//
// Uso: node catalogo-propio.js <carpeta-salida> [--dolar 1575]
//
// Deja:
//   tarjetas/NN-<servicio>.png  1080 × 1080, una por servicio, para subir al catálogo de WhatsApp Business
//   catalogo.txt                nombre, precio en pesos y descripción de cada producto, para copiar
//   perfil.txt                  descripción del perfil, bienvenida, ausencia y respuestas rápidas
// Los precios en pesos cambian con el dólar: volvé a correrlo cuando lo actualices.
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '../../../..');

const ELEGIDOS = [
  // [nombre en precios.md, etiqueta, línea para el catálogo, link de muestra (relativo a la web del taller)]
  ['Esencial', 'Web', 'Página web de una pantalla', 'muestras/ferreteria/'],
  ['Completa', 'Web', 'Página web completa', 'muestras/ferreteria/'],
  ['Catálogo', 'Web', 'Catálogo con buscador y pedido por WhatsApp', 'muestras/catalogo-vivo/'],
  ['Puesta a punto de Google', 'Google', 'Ficha de Google lista y tarjeta de reseñas', 'muestras/presencia/'],
  ['Presencia', 'Abono', 'Presencia mensual en Google', 'muestras/presencia/'],
  ['WhatsApp Business configurado', 'WhatsApp', 'Tu WhatsApp Business configurado', ''],
  ['Taller abierto', 'Taller', 'Taller de IA para tu comercio', 'talleres/']
];
const BASE_WEB = 'https://ezebesserr.github.io/Ezequiel-Besser-repositorio-1/';

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function pesos(n) { return '$ ' + (Math.round(n / 1000) * 1000).toLocaleString('es-AR'); }
function slug(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

(async () => {
  const a = process.argv.slice(2);
  const salidaArg = a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1] === '--dolar'));
  if (!salidaArg) { console.error('Uso: node catalogo-propio.js <carpeta-salida> [--dolar 1575]'); process.exit(1); }
  const salida = path.resolve(salidaArg);
  const md = fs.readFileSync(path.join(REPO, 'creador/negocio/precios.md'), 'utf8');
  const perfilMd = fs.readFileSync(path.join(REPO, 'creador/negocio/perfil.md'), 'utf8');
  const campo = n => { const m = new RegExp('\\*\\*' + n + '\\*\\*:\\s*(.+)').exec(perfilMd); const v = m ? m[1].trim() : ''; return /completar/i.test(v) ? '' : v.replace(/\s*\(si firman.*$/i, ''); };
  const firma = campo('Nombre para firmar') || 'Ezequiel Besser';
  const presentacion = campo('Presentación') || 'estudiante avanzado de Ingeniería';

  const items = {};
  md.split('\n').forEach(l => { const m = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*$/.exec(l); if (m) items[m[1]] = { incluye: m[2], usd: Number(m[3]) }; });
  const iDolar = a.indexOf('--dolar');
  let dolar = iDolar >= 0 ? Number(a[iDolar + 1]) : null, fuente = 'cargado a mano';
  if (!dolar) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
      const j = await (await fetch('https://dolarapi.com/v1/dolares/oficial', { signal: ctl.signal })).json(); clearTimeout(t);
      if (j && j.venta) { dolar = Number(j.venta); fuente = 'del día'; }
    } catch (e) { /* sin red */ }
  }
  if (!dolar) {
    const m = /Dólar oficial de referencia:\s*\$([\d.]+)\s*\(([^)]*)\)/.exec(md);
    dolar = m ? Number(m[1].replace(/\./g, '')) : 0; fuente = m ? 'de referencia (' + m[2] + ')' : 'sin dato';
    console.log('AVISO: usé el dólar de referencia de precios.md. Pasá --dolar con el de hoy antes de cargar los precios.');
  }

  fs.mkdirSync(path.join(salida, 'tarjetas'), { recursive: true });
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  const lineas = [];
  let n = 0;
  for (const [nombre, etiqueta, titulo, muestra] of ELEGIDOS) {
    const it = items[nombre];
    if (!it) { console.log(`AVISO: «${nombre}» no está en precios.md; lo salteo.`); continue; }
    n++;
    const mensual = /por mes/i.test(it.incluye), porPersona = /por persona/i.test(it.incluye);
    const desc = it.incluye.replace(/\s*(Pago único|Por mes|Por persona)\.?\s*$/i, '').trim();
    const sufijo = mensual ? ' por mes' : porPersona ? ' por persona' : '';
    const precioArs = dolar ? pesos(it.usd * dolar) : '';
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500&family=Chivo+Mono:wght@500;600&family=Chivo:wght@800;900&display=swap">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1080px;height:1080px;background:#eef0ee;display:flex;align-items:center;justify-content:center;font-family:"Alegreya Sans",sans-serif;color:#182019}
  .t{position:relative;width:940px;height:940px;background:#fff;border:2px solid #d3d9d4;border-radius:6px;padding:70px 80px 64px 110px;display:flex;flex-direction:column;gap:30px;box-shadow:0 30px 60px -40px rgba(0,0,0,.5)}
  .t::before{content:"";position:absolute;left:40px;top:40px;bottom:40px;width:12px;background:radial-gradient(circle,#eef0ee 5px,transparent 6px) 0 0/12px 26px repeat-y}
  .eti{font:600 26px "Chivo Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#2342ac}
  h1{font:900 76px/1.02 "Chivo",sans-serif;letter-spacing:-.01em}
  .precio{font:800 64px/1 "Chivo",sans-serif;color:#6b3ca8;border-top:4px solid #d2463a;padding-top:26px}
  .precio small{display:block;font:500 26px "Chivo Mono",monospace;color:#4f5a52;margin-top:12px}
  p.d{font-size:34px;line-height:1.35;color:#2b342d}
  .pie{margin-top:auto;font:500 24px "Chivo Mono",monospace;color:#4f5a52}
</style></head><body><div class="t">
  <span class="eti">${esc(etiqueta)}</span>
  <h1>${esc(titulo)}</h1>
  <div class="precio">${precioArs ? esc(precioArs) + esc(sufijo) : 'USD ' + it.usd + esc(sufijo)}<small>USD ${it.usd}${esc(sufijo)} · en pesos al dólar oficial del día</small></div>
  <p class="d">${esc(desc)}</p>
  <p class="pie">${esc(firma)} · páginas web para comercios</p>
</div></body></html>`;
    await p.setContent(html, { waitUntil: 'load' }); await p.waitForTimeout(500);
    const archivo = `${String(n).padStart(2, '0')}-${slug(nombre)}.png`;
    await p.screenshot({ path: path.join(salida, 'tarjetas', archivo) });
    lineas.push(`${n}. ${titulo}\n   Precio: ${precioArs ? precioArs + sufijo : 'USD ' + it.usd + sufijo} (USD ${it.usd}${sufijo})\n   Descripción: ${desc} Se cobra en pesos al dólar oficial del día.\n   Link: ${muestra ? BASE_WEB + muestra : '(sin link)'}\n   Imagen: tarjetas/${archivo}`);
  }
  await b.close();

  fs.writeFileSync(path.join(salida, 'catalogo.txt'), `Catálogo para WhatsApp Business (Herramientas para la empresa → Catálogo → Agregar artículo)\nDólar ${fuente}: $ ${dolar.toLocaleString('es-AR')}\n\n` + lineas.join('\n\n') + '\n');
  const perfil = `PERFIL DE WHATSAPP BUSINESS

Categoría: Diseño de sitios web
Descripción (corta):
Páginas web para comercios de zona norte, pensadas para el celular, con WhatsApp a un toque. Muestra gratis antes de pagar. También fichas de Google, catálogos con precios al día y talleres de IA.

MENSAJE DE BIENVENIDA
¡Hola! Gracias por escribir. Soy ${firma}, ${presentacion}, y hago páginas web para comercios de la zona. Contame el nombre de tu negocio y, si tenés, el link de tu web o tu Instagram: te armo una muestra sin cargo para que veas cómo quedaría.

MENSAJE DE AUSENCIA
¡Gracias por escribir! Ahora no puedo responder, pero te contesto hoy mismo. Mientras, podés ver un trabajo mío: ${BASE_WEB}muestras/ferreteria/

RESPUESTAS RÁPIDAS (atajo → texto)
/muestra → Te armo una muestra sin cargo de cómo quedaría la web de tu negocio, con lo que hoy tenés en tu web o tus redes. Si te gusta, lo charlamos; si no, no pasa nada. ¿Me pasás el link o el Instagram?
/precios → Las webs van desde USD ${items.Esencial ? items.Esencial.usd : '—'} (una pantalla) hasta USD ${items['Catálogo'] ? items['Catálogo'].usd : '—'} (catálogo con buscador), en pesos al dólar oficial del día. Están todas en el catálogo de este WhatsApp. Antes de cualquier pago te mando una muestra gratis.
/pasos → 1) Te armo la muestra gratis. 2) Si te gusta, te paso el presupuesto. 3) Seña del 50 % y arranco. 4) Te mando la primera versión para revisar. 5) Publicamos y pagás el resto.
/pago → Se paga la mitad para arrancar y la mitad al publicar, por transferencia. El dominio queda siempre a tu nombre.
/plazos → La web de una pantalla está en una semana; la completa, en 10 a 14 días; el catálogo, en unas 3 semanas. Siempre desde que tengo tu material.
/google → Además de la web, te dejo la ficha de Google completa y una tarjeta con QR para pedir reseñas en el mostrador. Mirá el informe que mando cada mes: ${BASE_WEB}muestras/presencia/
`;
  fs.writeFileSync(path.join(salida, 'perfil.txt'), perfil);
  console.log(`Listo: ${n} tarjetas en ${path.join(salida, 'tarjetas')}, más catalogo.txt y perfil.txt (dólar ${fuente}: $ ${dolar}).`);
})().catch(e => { console.error(e); process.exit(1); });
