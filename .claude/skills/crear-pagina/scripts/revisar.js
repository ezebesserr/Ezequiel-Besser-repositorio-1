// Revisa una web antes de mostrarla o entregarla.
// Uso: node revisar.js <archivo-o-url> [carpeta-salida] [--og ruta/og.jpg]
// Saca capturas completas en compu (1280) y celular (390), genera la imagen para compartir
// si se pide (--og, 1200x630) y lista problemas: errores de JavaScript, scroll horizontal,
// imágenes sin alt o muy pesadas, metadatos faltantes, links vacíos y botones de contacto.
// También avisa si la página tiene "cara de IA" (letras, degradés, frases y cajas de plantilla).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const ogAt = args.indexOf('--og');
  const ogPath = ogAt >= 0 ? args[ogAt + 1] : null;
  const pos = args.filter((a, i) => ogAt < 0 || (i !== ogAt && i !== ogAt + 1));
  const target = pos[0];
  const outDir = pos[1] || 'revision';
  if (!target) { console.error('Uso: node revisar.js <archivo-o-url> [carpeta-salida] [--og ruta/og.jpg]'); process.exit(1); }
  const isUrl = /^https?:\/\//.test(target);
  const url = isUrl ? target : 'file://' + path.resolve(target);
  const baseDir = isUrl ? null : path.dirname(path.resolve(target));
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const rep = { url, problemas: [], avisos: [], generico: [], datos: {} };

  for (const [nombre, vp, mobile] of [['escritorio', { width: 1280, height: 900 }, false], ['celular', { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, locale: 'es-AR' });
    const page = await ctx.newPage();
    const errs = [], fallidas = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('requestfailed', r => fallidas.push(r.url()));
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, nombre + '.jpg'), type: 'jpeg', quality: 70, fullPage: true });
    // En el celular el navegador agranda la pantalla para que entre lo que sobra: se compara contra el ancho real (390).
    const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    const anchoReal = Math.min(ancho[1], vp.width);
    if (ancho[0] > anchoReal) rep.problemas.push(`${nombre}: la página se corre de costado (${ancho[0]}px de ancho en una pantalla de ${anchoReal}px)`);
    errs.forEach(e => rep.problemas.push(`${nombre}: error de JavaScript: ${e.slice(0, 160)}`));
    fallidas.forEach(f => rep.problemas.push(`${nombre}: no cargó ${f.slice(0, 140)}`));

    if (!mobile) {
      const d = await page.evaluate(() => {
        const meta = n => (document.querySelector(`meta[name="${n}"]`) || {}).content || '';
        const prop = n => (document.querySelector(`meta[property="${n}"]`) || {}).content || '';
        const imgs = [...document.images].map(i => ({ src: i.getAttribute('src') || '', alt: i.getAttribute('alt') }));
        const links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
        let peso = 0;
        try { performance.getEntriesByType('resource').forEach(r => { peso += r.transferSize || 0; }); peso += (performance.getEntriesByType('navigation')[0] || {}).transferSize || 0; } catch (e) {}
        return {
          lang: document.documentElement.lang, title: document.title, description: meta('description'),
          viewport: meta('viewport'), robots: meta('robots'), ogTitle: prop('og:title'), ogImage: prop('og:image'),
          jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].length,
          h1: document.querySelectorAll('h1').length, imgs, peso,
          vacios: links.filter(h => h === '#' || h === '').length,
          tel: links.filter(h => h.startsWith('tel:')), wa: links.filter(h => /wa\.me|api\.whatsapp/.test(h)),
          mail: links.filter(h => h.startsWith('mailto:'))
        };
      });
      rep.datos = { titulo: d.title, descripcion: d.description, telefonos: d.tel, whatsapp: d.wa, mails: d.mail, pesoKB: Math.round(d.peso / 1024) || null };
      if (!d.lang) rep.problemas.push('Falta el idioma en <html lang="es">');
      if (!d.title || d.title.length < 10) rep.problemas.push('Falta un <title> descriptivo (negocio + rubro + barrio)');
      if (!d.description) rep.problemas.push('Falta <meta name="description">');
      if (!d.viewport) rep.problemas.push('Falta <meta name="viewport">: en el celular se va a ver en miniatura');
      if (!d.ogTitle || !d.ogImage) rep.problemas.push('Falta la vista previa para compartir (og:title y og:image)');
      if (d.h1 !== 1) rep.avisos.push(`Hay ${d.h1} títulos <h1>; lo ideal es uno`);
      if (!d.jsonld) rep.avisos.push('No tiene datos estructurados (JSON-LD LocalBusiness). Agregalos en sitios de negocios reales');
      if (/noindex/i.test(d.robots)) rep.avisos.push('Tiene noindex: está bien en una muestra, hay que sacarlo en el sitio final');
      if (d.vacios) rep.avisos.push(`${d.vacios} links apuntan a "#" (en el sitio final tienen que ir a algún lado)`);
      if (!d.wa.length && !d.tel.length) rep.avisos.push('No hay botón de WhatsApp ni de teléfono con link real');
      d.wa.forEach(w => { if (!/wa\.me\/549\d{10}|phone=549\d{10}/.test(w)) rep.avisos.push(`Revisá el número de WhatsApp: ${w.slice(0, 80)} (formato: https://wa.me/549 + característica sin 0 + número sin 15)`); });
      d.imgs.forEach(i => { if (i.alt === null) rep.problemas.push(`Imagen sin texto alternativo (alt): ${i.src.slice(0, 80)}`); });
      if (baseDir) {
        d.imgs.forEach(i => {
          if (!i.src || /^(https?:|data:)/.test(i.src)) return;
          try { const kb = fs.statSync(path.join(baseDir, i.src.split('?')[0])).size / 1024; if (kb > 300) rep.problemas.push(`Imagen pesada (${Math.round(kb)} KB): ${i.src}. Comprimila a menos de 300 KB`); } catch (e) {}
        });
      }
      if (d.peso > 1.5 * 1024 * 1024) rep.problemas.push(`La página pesa ${Math.round(d.peso / 1024)} KB; apuntá a menos de 1.500 KB`);

      // Detector de diseño genérico ("cara de IA")
      const gen = await page.evaluate(() => {
        const out = [];
        const fam = el => (getComputedStyle(el).fontFamily || '').split(',')[0].replace(/["']/g, '').trim().toLowerCase();
        const muestra = [...document.querySelectorAll('h1,h2,h3,p,a,button,li')].slice(0, 300);
        const fams = new Set(muestra.map(fam).concat([fam(document.body)]));
        const GEN = ['inter', 'poppins', 'montserrat', 'roboto', 'open sans', 'space grotesk', 'dm sans', 'lato', 'nunito', 'raleway', 'plus jakarta sans', 'outfit', 'urbanist'];
        const usadas = [...fams].filter(f => GEN.includes(f));
        if (usadas.length) out.push('Letra típica de webs hechas con IA: ' + usadas.join(', ') + '. Buscá una que salga del cartel o de la época del local.');
        const rgbs = s => (s.match(/rgba?\([^)]+\)/g) || []).map(x => x.match(/[\d.]+/g).slice(0, 3).map(Number));
        const tono = ([r, g, b]) => {
          r /= 255; g /= 255; b /= 255;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn;
          if (!dd) return null;
          const l = (mx + mn) / 2, s = dd / (1 - Math.abs(2 * l - 1));
          if (s < 0.25) return null;
          let h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
          h *= 60; return h < 0 ? h + 360 : h;
        };
        const todos = [...document.querySelectorAll('body *')].slice(0, 2000);
        let violeta = false, vidrio = false; const cajas = {};
        for (const el of todos) {
          const cs = getComputedStyle(el);
          if (/gradient/.test(cs.backgroundImage)) {
            const hs = rgbs(cs.backgroundImage).map(tono).filter(h => h !== null);
            if (hs.filter(h => h >= 200 && h <= 320).length >= 2 && hs.some(h => h >= 250 && h <= 300)) violeta = true;
          }
          const bf = cs.backdropFilter || cs.webkitBackdropFilter;
          if (bf && bf !== 'none') vidrio = true;
          const rad = parseFloat(cs.borderTopLeftRadius);
          if (rad >= 12 && cs.boxShadow !== 'none') { const k = rad + '|' + cs.boxShadow; cajas[k] = (cajas[k] || 0) + 1; }
        }
        if (violeta) out.push('Degradé violeta o azul: es el sello más común de las webs hechas con IA.');
        if (vidrio) out.push('Efecto vidrio (fondo desenfocado): muy de plantilla.');
        const iguales = Math.max(0, ...Object.values(cajas));
        if (iguales >= 8) out.push(`${iguales} cajas con el mismo redondeo grande y la misma sombra: se ve a plantilla. Diferenciá cada bloque por lo que es.`);
        const emo = /\p{Extended_Pictographic}/u;
        const conEmoji = [...document.querySelectorAll('h1,h2,h3,h4,button,a,li,[class*=icon],[class*=icono]')].filter(e => emo.test(e.textContent || '')).length;
        if (conEmoji >= 2) out.push(`${conEmoji} títulos, botones o ítems con emojis: usá íconos o dibujos propios del rubro.`);
        const txt = (document.body.innerText || '').toLowerCase();
        const FR = ['soluciones integrales', 'somos una empresa', 'empresa líder', 'líderes en', 'calidad y compromiso', 'tu mejor opción', 'su mejor opción', 'siguiente nivel', 'bienvenidos a', 'en el corazón de', 'pasión por', 'experiencia única', 'transformamos', 'lorem ipsum', 'get started', 'learn more'];
        const fr = FR.filter(f => txt.includes(f));
        if (fr.length) out.push('Frases de plantilla: «' + fr.join('», «') + '». Cambialas por datos reales del local.');
        const stock = [...document.images].map(i => i.currentSrc || i.getAttribute('src') || '').filter(s => /unsplash|pexels|pixabay|freepik|shutterstock|istockphoto|stock\.adobe/.test(s));
        if (stock.length) out.push(`${stock.length} fotos de bancos de imágenes: usá fotos reales del negocio.`);
        const bloques = [...document.querySelectorAll('h1,h2,h3,p')].filter(e => (e.textContent || '').trim().length > 20);
        const centrados = bloques.filter(e => getComputedStyle(e).textAlign === 'center').length;
        if (bloques.length >= 6 && centrados / bloques.length > 0.6) out.push('Casi todo el texto está centrado: alineá a la izquierda lo que se lee.');
        const fondo = rgbs(getComputedStyle(document.body).backgroundColor)[0];
        if (fondo) {
          const [r, g, b] = fondo;
          if (r > 236 && g > 228 && b > 212 && r - b >= 8 && r - b <= 30) {
            const terracota = [...document.querySelectorAll('a,button,[class*=btn]')].some(e => { const c = rgbs(getComputedStyle(e).backgroundColor)[0]; const h = c ? tono(c) : null; return h !== null && h >= 5 && h <= 28; });
            if (terracota) out.push('Fondo crema con acento terracota: combinación típica de diseño hecho por IA.');
          }
        }
        return out;
      });
      gen.forEach(g => rep.generico.push(g));
    }
    await ctx.close();
  }

  if (ogPath) {
    const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await og.goto(url, { waitUntil: 'load', timeout: 45000 });
    await og.waitForTimeout(1200);
    await og.screenshot({ path: ogPath, type: 'jpeg', quality: 78 });
    rep.datos.og = ogPath;
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'reporte.json'), JSON.stringify(rep, null, 2));
  console.log(`Capturas: ${path.join(outDir, 'escritorio.jpg')} y ${path.join(outDir, 'celular.jpg')}`);
  console.log(rep.problemas.length ? 'PROBLEMAS:\n- ' + rep.problemas.join('\n- ') : 'Sin problemas.');
  if (rep.avisos.length) console.log('AVISOS:\n- ' + rep.avisos.join('\n- '));
  console.log(rep.generico.length ? 'DISEÑO GENÉRICO (parece hecho por IA):\n- ' + rep.generico.join('\n- ') : 'Diseño genérico: no se detectó nada.');
})().catch(e => { console.error(e); process.exit(1); });
