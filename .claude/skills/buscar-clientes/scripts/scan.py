"""Puntúa qué tan viejo o cutre es el sitio de cada negocio.

Uso: python3 scan.py candidatos.json escaneados.json
Entrada: la lista que genera extract.py. Salida: la misma lista con score, señales (flags) y título.
"""
import json, re, sys, ssl, time, os, datetime, concurrent.futures as cf
import urllib.request, urllib.error
from urllib.parse import urlparse

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
_CA = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
CTX = ssl.create_default_context(cafile=_CA) if _CA else ssl.create_default_context()
NOW = datetime.date.today().year

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        body = r.read(1_500_000)
        return r.geturl(), r.status, body, time.time() - t0, dict(r.headers)

def decode(body, headers):
    ct = headers.get("Content-Type", "") or headers.get("content-type", "")
    m = re.search(r"charset=([\w-]+)", ct) or re.search(rb'charset=["\']?([\w-]+)', body[:3000])
    enc = (m.group(1).decode() if isinstance(m.group(1), bytes) else m.group(1)) if m else "utf-8"
    try: return body.decode(enc, errors="replace")
    except LookupError: return body.decode("utf-8", errors="replace")

CHECKS = [
    # (clave, peso, regex, descripcion)
    ("flash", 4, r"\.swf\b|application/x-shockwave-flash|swfobject", "usa Flash (muerto desde 2020)"),
    ("frames", 3, r"<frameset", "hecho con frames"),
    ("marquee", 3, r"<marquee|<blink", "texto con <marquee>/<blink>"),
    ("font_tag", 2, r"<font\s", "usa etiquetas <font>"),
    ("center_tag", 1, r"<center>", "usa <center>"),
    ("bgcolor", 1, r"\sbgcolor=", "colores con bgcolor= (HTML de los 90)"),
    ("spacer", 2, r"spacer\.gif|transparent\.gif|pixel\.gif", "maquetado con spacer.gif"),
    ("bgsound", 3, r"<bgsound|\.mid[\"']", "musica de fondo MIDI"),
    ("counter", 3, r"contador de visitas|visitante n[uú]mero|hit-?counter|contador\.|counter\.(?:digits|website|htmlweb)|eu\.contador", "contador de visitas"),
    ("guestbook", 2, r"libro de visitas|guestbook", "libro de visitas"),
    ("best_viewed", 3, r"(?:mejor|óptimo|optimizado)[^<]{0,40}(?:800\s?x\s?600|1024\s?x\s?768|internet explorer)|best viewed", "\"se ve mejor en 1024x768 / Internet Explorer\""),
    ("construccion", 3, r"(?:sitio|p[aá]gina|web)\s+en\s+construcci[oó]n|under construction", "\"sitio en construcción\""),
    ("frontpage", 3, r"Microsoft FrontPage|Microsoft Word|Namo WebEditor|NetObjects|Web Easy|iWeb|Microsoft Publisher|Adobe Muse|Homestead|Website X5|WYSIWYG Web Builder|Serif WebPlus|Sitio Simple", "hecho con editor antiguo (FrontPage/Muse/Word/etc.)"),
    ("dreamweaver", 1, r"MM_swapImage|MM_preloadImages|MM_findObj", "rollovers de Dreamweaver (≈2005)"),
    ("comic_sans", 2, r"comic sans", "usa Comic Sans"),
    ("bienvenidos", 1, r"bienvenidos? a nuestr[oa] (?:sitio|p[aá]gina|web)", "\"Bienvenidos a nuestra página web\""),
    ("ie_hacks", 1, r"<!--\[if (?:lt )?IE [5-8]|DD_belatedPNG|ie6|pngfix", "parches para Internet Explorer 6-8"),
    ("tables_layout", 2, None, "maquetado con tablas"),
    ("no_viewport", 4, None, "no está adaptado a celular (sin viewport)"),
    ("old_copyright", 3, None, "copyright viejo"),
    ("old_jquery", 1, r"jquery[-.]?1\.[0-7]\.|jquery\.min\.js\?ver=1\.[0-7]", "jQuery de hace más de 10 años"),
    ("old_generator", 2, None, "CMS muy desactualizado"),
    ("no_https", 2, None, "no tiene HTTPS (navegador dice 'No seguro')"),
    ("untitled", 2, r"<title>\s*(?:untitled|documento sin t[ií]tulo|p[aá]gina nueva|sin t[ií]tulo|new page|home|index|inicio)\s*</title>", "título de página genérico ('Documento sin título')"),
    ("animated_gif", 1, None, "muchas imágenes GIF"),
    ("free_host", 2, r"", "en hosting/subdominio gratuito"),
]
FREE = re.compile(r"(blogspot|wordpress\.com|webnode|wixsite|weebly|jimdo|000webhost|galeon|tripod|geocities|"
                  r"fullblog|webcindario|ucoz|site123|mex\.tl|es\.tl|com\.ar\.tc|hostinger|webs\.com|"
                  r"sites\.google|neocities|altervista|byethost|freehostia|godaddysites|ueniweb|negocio\.site|business\.site)", re.I)

def analyze(row):
    url = row["web"]
    res = dict(row, ok=False, score=0, flags=[], status=None, final=None, err=None, year=None, title="")
    https_failed = False
    try:
        final, status, body, dt, hdr = fetch(url)
    except Exception as e:
        # reintentar con http si https falla por SSL, o con https si http falla
        alt = url.replace("https://", "http://") if url.startswith("https") else url.replace("http://", "https://")
        try:
            final, status, body, dt, hdr = fetch(alt)
            https_failed = url.startswith("https")
        except Exception as e2:
            res["err"] = type(e2).__name__ + ": " + str(e2)[:120]
            return res
    html = decode(body, hdr)
    low = html.lower()
    res.update(ok=True, status=status, final=final, secs=round(dt, 1), size=len(body))
    if len(low.strip()) < 400 or "domain is for sale" in low or "este dominio" in low and "venta" in low \
       or "parked" in low[:3000] or "suspended" in low[:3000] or "cuenta suspendida" in low:
        res["parked"] = True
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    res["title"] = re.sub(r"\s+", " ", m.group(1)).strip()[:100] if m else ""
    flags = []
    def add(key):
        for k, w, rx, d in CHECKS:
            if k == key:
                flags.append((k, w, d)); return
    for k, w, rx, d in CHECKS:
        if rx and k != "free_host" and re.search(rx, html, re.I):
            add(k)
    if not re.search(r'<meta[^>]+name=["\']?viewport', html, re.I): add("no_viewport")
    ntab = len(re.findall(r"<table", low)); ndiv = len(re.findall(r"<div", low))
    if ntab >= 4 and ntab * 3 >= ndiv: add("tables_layout")
    years = [int(y) for y in re.findall(r"(?:©|&copy;|copyright|derechos reservados)[^<]{0,40}?((?:19|20)\d\d)(?!\d)", html, re.I)]
    years += [int(y) for y in re.findall(r"((?:19|20)\d\d)(?!\d)[^<]{0,10}(?:©|&copy;)", html, re.I)]
    years = [y for y in years if 1995 <= y <= NOW]
    if years:
        y = max(years); res["year"] = y
        if y <= NOW - 6:
            add("old_copyright"); flags[-1] = ("old_copyright", 3 if y > 2015 else 4, f"copyright © {y}")
    g = re.search(r'<meta[^>]+name=["\']generator["\'][^>]+content=["\']([^"\']+)', html, re.I) \
        or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']generator', html, re.I)
    if g:
        gen = g.group(1); res["generator"] = gen[:60]
        mm = re.search(r"WordPress (\d+)\.(\d+)", gen)
        if (mm and int(mm.group(1)) < 5) or re.search(r"Joomla! 1\.|Joomla! 2\.5|Drupal [4-7]\b", gen):
            add("old_generator")
    if not final.startswith("https") or https_failed: add("no_https")
    if len(re.findall(r"<img[^>]+\.gif", low)) >= 6: add("animated_gif")
    if FREE.search(final): add("free_host")
    res["flags"] = [d for _, _, d in flags]
    res["keys"] = [k for k, _, _ in flags]
    res["score"] = sum(w for _, w, _ in flags)
    return res

if __name__ == "__main__":
    rows = json.load(open(sys.argv[1]))
    out = []
    with cf.ThreadPoolExecutor(24) as ex:
        for i, r in enumerate(ex.map(analyze, rows)):
            out.append(r)
            if i % 250 == 0: print(i, flush=True)
    json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False)
    ok = [r for r in out if r["ok"] and not r.get("parked")]
    print("respondieron:", len(ok), "de", len(out))
    for r in sorted(ok, key=lambda r: -r["score"])[:40]:
        print(r["score"], r["name"], "|", r["cat"], "|", r["final"], "|", ", ".join(r["flags"]))
