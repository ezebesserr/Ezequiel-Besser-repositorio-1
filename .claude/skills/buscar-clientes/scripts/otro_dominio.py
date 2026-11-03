"""Busca si cada negocio ya tiene una web nueva en otro dominio.

Prueba variantes del nombre (.com.ar, .com, .ar), sigue redirecciones y mira los links de su web vieja.
Marca «fuerte» cuando la web candidata repite su teléfono o su calle. Siempre confirmá a ojo antes de descartar:
hay muchos negocios distintos con nombres parecidos.

Uso: python3 otro_dominio.py negocios.json salida.json
Entrada: lista de {"i", "name", "dom", "web", "addr", "phones": [...], "wa"}.
"""
import json, re, ssl, sys, os, unicodedata, html, concurrent.futures as cf, urllib.request
from urllib.parse import urlparse, urljoin
CA = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=CA if os.path.exists(CA) else None)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
STOP = {"la","el","los","las","de","del","y","e","sa","srl","s","a","r","l","the","and","en"}
RUBRO = set("""pizzeria hotel hostel boutique ferreteria vinoteca vinotecas refrigeracion centro medico medica kinesico kinesiologia propiedades inmobiliaria
cerveceria confiteria libreria esoterica sanitarios repuestos rodados sepelios electronica baterias bowling vivero cafe restaurant restaurante resto club
grafica marcos cuadros helados artesanales articulos limpieza muebles motores tienda optica opticas tenis lawn tennis futbol complejo calidez blancos
alta complejidad doctor dr flebologico rehabilitacion oral implantes dentales digital insumos herramientas fabrica ventas venta""".split())
SOCIAL = re.compile(r"(facebook|instagram|twitter|x\.com|youtube|youtu\.be|wa\.me|whatsapp|google|goo\.gl|linkedin|tripadvisor|booking|mercadolibre|pinterest|tiktok|wix\.com|webnode|weebly|blogger|blogspot\.com/?$|addthis|w3\.org|jquery|cloudflare|gstatic|fonts|schema\.org|adobe|macromedia|apple\.com|microsoft|bit\.ly|linktr)", re.I)
TIENDA = re.compile(r"(mitiendanube\.com|tiendanube\.com|empretienda|mercadoshops|tiendup|shopify|wixsite\.com|negocio\.site|business\.site)", re.I)
PARK = re.compile(r"(domain (is )?for sale|este dominio (est[aá] )?(en venta|a la venta)|parked|sedo|porkbun|godaddy|brand new domain|buy this domain|dan\.com|afternic|hostinger.*(parked|default)|index of /|default web site page|plesk|cpanel|it works!)", re.I)

def norm(s):
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]+", " ", s.replace("&", " y "))

def get(url, n=600000):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9"})
    with urllib.request.urlopen(req, timeout=15, context=CTX) as r:
        return r.geturl(), r.read(n).decode("utf-8", "replace")

def variantes(lead):
    w_all = [w for w in norm(lead["name"]).split() if w]
    core = [w for w in w_all if w not in RUBRO]
    core_noart = [w for w in core if w not in STOP]
    slugs = []
    for ws in (w_all, core, core_noart):
        if ws:
            for s in ("".join(ws), "-".join(ws)):
                if 3 <= len(s) <= 40 and s not in slugs: slugs.append(s)
    known = lead["dom"].lower().removeprefix("www.")
    out = []
    for s in slugs[:4]:
        for tld in (".com.ar", ".com", ".ar"):
            d = s + tld
            if d != known and d not in out: out.append(d)
    toks = [w for w in core_noart if len(w) >= 4] or [w for w in w_all if len(w) >= 4 and w not in STOP]
    return out[:12], toks

def revisar_candidato(d, toks, lead):
    try:
        final, h = get("https://" + d)
    except Exception:
        try: final, h = get("http://" + d)
        except Exception: return None
    t = html.unescape(re.sub(r"(?s)<(script|style).*?</\1>|<[^>]+>", " ", h)); tl = norm(t + " " + h[:3000])
    if len(t.strip()) < 200 or PARK.search(h[:20000]): return None
    if not toks or not all(tok in tl for tok in toks[:2]): return None
    fones = [re.sub(r"\D", "", p)[-4:] for p in lead.get("phones", []) + ([lead["wa"]] if lead.get("wa") else []) if len(re.sub(r"\D", "", p)) >= 8]
    calle = norm(lead.get("addr", "")).split()
    calle = [w for w in calle if len(w) >= 5 and not w.isdigit()][:1]
    digits = re.sub(r"\D", "", h)
    fuerte = any(f and f in digits for f in fones) or any(c in tl for c in calle)
    viewport = bool(re.search(r'<meta[^>]+name=["\']?viewport', h, re.I))
    years = [int(y) for y in re.findall(r"(?:©|&copy;|copyright)[^<]{0,30}?((?:19|20)\d\d)", h, re.I)]
    host = urlparse(final).netloc.lower().removeprefix("www.")
    if host == lead["dom"].lower().removeprefix("www."): return None
    return {"dominio": host, "url": final, "coincide": "fuerte" if fuerte else "posible", "moderna": viewport and final.startswith("https"), "copyright": max(years) if years else None,
            "titulo": (re.search(r"(?is)<title[^>]*>(.*?)</title>", h).group(1).strip()[:90] if re.search(r"(?is)<title[^>]*>(.*?)</title>", h) else "")}

def revisar(lead):
    res = {"i": lead["i"], "name": lead["name"], "dom": lead["dom"], "candidatos": [], "links": [], "tienda": [], "redirige": None}
    cands, toks = variantes(lead)
    with cf.ThreadPoolExecutor(6) as ex:
        for r in ex.map(lambda d: revisar_candidato(d, toks, lead), cands):
            if r and r["dominio"] not in [c["dominio"] for c in res["candidatos"]]: res["candidatos"].append(r)
    try:
        final, h = get(lead["web"])
        fh = urlparse(final).netloc.lower().removeprefix("www.")
        if fh and fh != lead["dom"].lower().removeprefix("www.") and not fh.endswith(lead["dom"].lower().removeprefix("www.")): res["redirige"] = final
        for a in re.findall(r'(?i)href=["\']([^"\'#]+)', h):
            u = urljoin(final, a); hh = urlparse(u).netloc.lower().removeprefix("www.")
            if not hh or hh == fh or hh.endswith("." + fh): continue
            if TIENDA.search(u):
                if u not in res["tienda"]: res["tienda"].append(u)
            elif not SOCIAL.search(hh) and toks and any(tok in norm(hh) for tok in toks):
                if hh not in res["links"]: res["links"].append(hh)
    except Exception:
        pass
    return res

if __name__ == "__main__":
    leads = json.load(open(sys.argv[1]))
    out = []
    with cf.ThreadPoolExecutor(8) as ex:
        for r in ex.map(revisar, leads): out.append(r)
    json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
    for r in out:
        if r["candidatos"] or r["links"] or r["tienda"] or r["redirige"]:
            print(r["i"], r["name"], "| conocida:", r["dom"])
            for c in r["candidatos"]: print("    CANDIDATO", c["dominio"], c["coincide"], "moderna" if c["moderna"] else "vieja", c["copyright"], "|", c["titulo"])
            for l in r["links"]: print("    LINK", l)
            for t in r["tienda"][:2]: print("    TIENDA", t)
            if r["redirige"]: print("    REDIRIGE", r["redirige"])
