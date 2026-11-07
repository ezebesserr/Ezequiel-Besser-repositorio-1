// Prueba todas las herramientas del taller con datos de ejemplo, en una carpeta temporal.
// Uso: node .claude/skills/venta-completa/scripts/probar-todo.js [carpeta-temporal]
// Corre cada script y verifica que deje sus archivos. Usalo después de tocar cualquiera de ellos.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '../../../..');
const S = n => path.join(REPO, '.claude/skills', n);
const tmp = path.resolve(process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'taller-')));
if (tmp === REPO || tmp.startsWith(REPO + path.sep)) { console.error('La carpeta temporal va fuera del repo.'); process.exit(1); }
fs.mkdirSync(tmp, { recursive: true });
const NODE = process.execPath;
const env = Object.assign({}, process.env);

function correr(cmd, args) { return execFileSync(cmd, args, { cwd: REPO, env, stdio: 'pipe', timeout: 240000 }).toString(); }
const resultados = [];
function prueba(nombre, fn, archivos) {
  const t0 = Date.now();
  try {
    fn();
    const faltan = (archivos || []).filter(f => !fs.existsSync(f) || fs.statSync(f).size === 0);
    if (faltan.length) throw new Error('no dejó: ' + faltan.map(f => path.relative(tmp, f)).join(', '));
    resultados.push(['OK', nombre, ((Date.now() - t0) / 1000).toFixed(1) + ' s']);
  } catch (e) {
    resultados.push(['FALLA', nombre, String(e.stderr || e.message).split('\n').filter(Boolean)[0] || 'error']);
  }
}

const E = S('catalogo-vivo/ejemplo');
prueba('precios.py (catálogo vivo)', () => correr('python3', [S('catalogo-vivo/scripts/precios.py'), '--base', E + '/base.csv', '--lista', E + '/lista-fijaciones-delta.csv', '--proveedor', 'Fijaciones Delta', '--reglas', E + '/reglas.json', '--salida', tmp + '/precios']),
  [tmp + '/precios/catalogo.csv', tmp + '/precios/cambios.html', tmp + '/precios/base-nueva.csv']);
prueba('planilla.py (catálogo vivo)', () => correr('python3', [S('catalogo-vivo/scripts/planilla.py'), '--negocio', 'Prueba', '--desde', E + '/base.csv', '--reglas', E + '/reglas.json', '--salida', tmp + '/planilla.xlsx']), [tmp + '/planilla.xlsx']);
prueba('lista.js (listas sin dolor)', () => correr(NODE, [S('catalogo-vivo/scripts/lista.js'), tmp + '/precios/base-nueva.csv', '--negocio', 'Prueba', '--anterior', E + '/base.csv', '--salida', tmp + '/lista']), [tmp + '/lista/lista.pdf', tmp + '/lista/lista.txt']);
prueba('tiendanube.py (socio de Tiendanube)', () => correr('python3', [S('catalogo-vivo/scripts/tiendanube.py'), E + '/base.csv', '--salida', tmp + '/tiendanube.csv']), [tmp + '/tiendanube.csv']);
const RC = S('redes-y-campanas/ejemplo');
prueba('campana.js (campañas a clientes)', () => correr(NODE, [S('redes-y-campanas/scripts/campana.js'), RC + '/clientes.csv', RC + '/campana.json', '--salida', tmp + '/campana']), [tmp + '/campana/envio.html', tmp + '/campana/resultados.csv']);
prueba('redes.js (redes del mes)', () => correr(NODE, [S('redes-y-campanas/scripts/redes.js'), RC + '/redes.json', '--salida', tmp + '/redes']), [tmp + '/redes/calendario.pdf', tmp + '/redes/textos.txt']);
prueba('presupuesto.js', () => correr(NODE, [S('mensajes-y-precios/scripts/presupuesto.js'), '--cliente', 'Prueba', '--paquete', 'completa', '--abono', 'presencia', '--dolar', '1500', '--salida', tmp + '/presupuesto']),
  [tmp + '/presupuesto/presupuesto.pdf', tmp + '/presupuesto/mensaje.txt']);
prueba('catalogo-propio.js', () => correr(NODE, [S('mensajes-y-precios/scripts/catalogo-propio.js'), tmp + '/whatsapp', '--dolar', '1500']), [tmp + '/whatsapp/catalogo.txt', tmp + '/whatsapp/perfil.txt']);

const html = fs.readFileSync(path.join(REPO, 'muestras/presencia/index.html'), 'utf8');
const datos = JSON.parse(/<script type="application\/json" id="datos">([\s\S]*?)<\/script>/.exec(html)[1]);
fs.mkdirSync(tmp + '/clientes/prueba', { recursive: true });
fs.writeFileSync(tmp + '/clientes/prueba/datos.json', JSON.stringify(Object.assign({}, datos, { negocio: 'Cliente de prueba', telefono: '11 2345-6789', abono_usd: 40 })));
prueba('informe.js (presencia)', () => correr(NODE, [S('presencia-mensual/scripts/informe.js'), tmp + '/clientes/prueba/datos.json', tmp + '/informe']), [tmp + '/informe/informe.pdf']);
prueba('cierre.js (presencia)', () => correr(NODE, [S('presencia-mensual/scripts/cierre.js'), tmp + '/clientes', tmp + '/cierre', '--dolar', '1500']), [tmp + '/cierre/cierre.html', tmp + '/cierre/prueba/informe.pdf']);
prueba('tarjeta.js (presencia)', () => correr(NODE, [S('presencia-mensual/scripts/tarjeta.js'), '--negocio', 'Prueba', '--link', 'https://example.com/resenas', '--salida', tmp + '/tarjeta']), [tmp + '/tarjeta/tarjeta.pdf']);
prueba('kit.js (talleres)', () => correr(NODE, [S('talleres-ia/scripts/kit.js'), S('talleres-ia/ejemplo/taller.json'), tmp + '/kit', '--dolar', '1500']), [tmp + '/kit/afiche.pdf', tmp + '/kit/propuesta.pdf']);
prueba('auditoria.js (buscar clientes)', () => correr(NODE, [S('buscar-clientes/scripts/auditoria.js'), path.join(REPO, 'muestras/ferreteria/index.html'), '--negocio', 'Prueba', '--salida', tmp + '/auditoria']), [tmp + '/auditoria/auditoria.png']);

fs.writeFileSync(tmp + '/lote.json', JSON.stringify([
  { name: 'Ferretería de prueba', cat: 'ferretería', web: path.join(REPO, 'muestras/ferreteria/index.html'), phone: '11 2345-6789', lat: -34.511, lon: -58.495 },
  { name: 'Catálogo de prueba', cat: 'bulonera', web: path.join(REPO, 'muestras/catalogo-vivo/index.html'), lat: -34.4985, lon: -58.4905 }]));
prueba('auditoria.js --lote (buscar clientes)', () => correr(NODE, [S('buscar-clientes/scripts/auditoria.js'), '--lote', tmp + '/lote.json', '--salida', tmp + '/lote']),
  [tmp + '/lote/mostrador.tsv', tmp + '/lote/mostrador.json', tmp + '/lote/resumen.html', tmp + '/lote/01-ferreteria-de-prueba/auditoria.png']);

fs.writeFileSync(tmp + '/escaneados.json', JSON.stringify([
  { id: 'p1', name: 'Catálogo de prueba', cat: 'shop=hardware', ok: true, score: 0, web: 'file://' + path.join(REPO, 'muestras/catalogo-vivo/index.html') },
  { id: 'p2', name: 'Ferretería de prueba', cat: 'shop=hardware', ok: true, score: 0, web: 'file://' + path.join(REPO, 'muestras/ferreteria/index.html') }]));
prueba('catalogo.py (buscar clientes)', () => correr('python3', [S('buscar-clientes/scripts/catalogo.py'), tmp + '/escaneados.json', tmp + '/catalogo.json']), [tmp + '/catalogo.json']);
prueba('ruta.js (buscar clientes)', () => correr(NODE, [S('buscar-clientes/scripts/ruta.js'), tmp + '/lote']), [tmp + '/lote/ruta.pdf', tmp + '/lote/imprimir.pdf']);

fs.mkdirSync(tmp + '/sitio', { recursive: true });
fs.writeFileSync(tmp + '/sitio/index.html', '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Negocio de prueba · rubro · barrio</title><meta name="description" content="Prueba de entrega."><meta property="og:image" content="https://example.com/og.jpg">' +
  '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Store","name":"Negocio de prueba","telephone":"+54 9 11 2345-6789","address":{"@type":"PostalAddress","streetAddress":"Calle 123"}}</script>' +
  '</head><body><h1>Negocio de prueba</h1><a href="https://wa.me/5491123456789">WhatsApp</a></body></html>');
prueba('entrega.js (publicar)', () => correr(NODE, [S('publicar/scripts/entrega.js'), tmp + '/sitio/index.html', '--negocio', 'Negocio de prueba', '--dominio', 'prueba.com.ar', '--abono', 'presencia', '--salida', tmp + '/entrega']),
  [tmp + '/entrega/entrega.pdf', tmp + '/entrega/mensaje.txt', tmp + '/entrega/chequeo.txt']);

const ancho = Math.max(...resultados.map(r => r[1].length));
resultados.forEach(r => console.log(`${r[0].padEnd(6)} ${r[1].padEnd(ancho)}  ${r[2]}`));
const fallas = resultados.filter(r => r[0] !== 'OK').length;
console.log(fallas ? `\n${fallas} con falla. Archivos en ${tmp}` : `\nTodo anda. Archivos en ${tmp}`);
process.exit(fallas ? 1 : 0);
