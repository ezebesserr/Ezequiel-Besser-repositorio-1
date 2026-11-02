// Saca capturas de cada sitio en compu (1280) y celular (390) y junta teléfonos, WhatsApp, mail e Instagram.
// Uso: node shoot.js preseleccion.json carpeta_capturas capturas.json
const { chromium } = require('playwright');
const fs = require('fs');
const [,, inFile, outDir, outJson] = process.argv;
const rows = JSON.parse(fs.readFileSync(inFile, 'utf8'));
(async () => {
  const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < rows.length) {
      const i = idx++; const r = rows[i];
      const id = String(i).padStart(3, '0');
      const res = { i, id: r.id, host: r.host, ok: false };
      for (const [kind, vp, mobile] of [['d', { width: 1280, height: 800 }, false], ['m', { width: 390, height: 844 }, true]]) {
        const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, ignoreHTTPSErrors: true,
          userAgent: mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined,
          locale: 'es-AR' });
        const page = await ctx.newPage();
        try {
          await page.goto(r.final || r.web, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(1500);
          await page.screenshot({ path: `${outDir}/${id}${kind}.jpg`, type: 'jpeg', quality: 60 });
          if (kind === 'd') {
            res.ok = true;
            const info = await page.evaluate(() => {
              const links = [...document.querySelectorAll('a[href]')].map(a => a.href);
              const txt = document.body ? document.body.innerText : '';
              return {
                tel: [...new Set(links.filter(h => h.startsWith('tel:')).map(h => h.slice(4)))].slice(0, 3),
                wa: [...new Set(links.filter(h => /wa\.me|whatsapp\.com\/send|api\.whatsapp/.test(h)))].slice(0, 2),
                mail: [...new Set(links.filter(h => h.startsWith('mailto:')).map(h => h.slice(7).split('?')[0]))].slice(0, 2),
                ig: [...new Set(links.filter(h => /instagram\.com\/[^/?#]+/.test(h)))].slice(0, 1),
                fb: [...new Set(links.filter(h => /facebook\.com\/[^/?#]+/.test(h) && !/sharer/.test(h)))].slice(0, 1),
                phones: [...new Set((txt.match(/(?:\+?54\s?)?(?:\(?0?11\)?[\s.-]?)?(?:15[\s.-]?)?[2-9]\d{3}[\s.-]?\d{4}/g) || []))].slice(0, 3),
                textLen: txt.length,
              };
            });
            Object.assign(res, info);
          }
        } catch (e) { res['err_' + kind] = String(e).slice(0, 120); }
        await ctx.close();
      }
      results.push(res);
      if (results.length % 10 === 0) console.log(results.length);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  await browser.close();
  fs.writeFileSync(outJson, JSON.stringify(results.sort((a, b) => a.i - b.i), null, 0));
})();
