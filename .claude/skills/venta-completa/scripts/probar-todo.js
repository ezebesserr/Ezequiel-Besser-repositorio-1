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
  { name: 'Ferretería de prueba', cat: 'ferretería', web: path.join(REPO, 'muestras/ferreteria/index.html'), phone: '11 2345-6789' },
  { name: 'Catálogo de prueba', cat: 'bulonera', web: path.join(REPO, 'muestras/catalogo-vivo/index.html') }]));
prueba('auditoria.js --lote (buscar clientes)', () => correr(NODE, [S('buscar-clientes/scripts/auditoria.js'), '--lote', tmp + '/lote.json', '--salida', tmp + '/lote']),
  [tmp + '/lote/mostrador.tsv', tmp + '/lote/mostrador.json', tmp + '/lote/resumen.html', tmp + '/lote/01-ferreteria-de-prueba/auditoria.png']);

const ancho = Math.max(...resultados.map(r => r[1].length));
resultados.forEach(r => console.log(`${r[0].padEnd(6)} ${r[1].padEnd(ancho)}  ${r[2]}`));
const fallas = resultados.filter(r => r[0] !== 'OK').length;
console.log(fallas ? `\n${fallas} con falla. Archivos en ${tmp}` : `\nTodo anda. Archivos en ${tmp}`);
process.exit(fallas ? 1 : 0);
