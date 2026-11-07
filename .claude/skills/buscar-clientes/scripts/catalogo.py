"""Busca prospectos para Catálogo vivo: comercios de rubros con muchos productos y señales de que manejan los precios a mano.

Uso: python3 catalogo.py escaneados.json catalogo.json [--todos]
Entrada: la salida de scan.py. Mira solo los rubros de catálogo grande (ferretería, materiales, electricidad, pinturería,
sanitarios, muebles, repuestos, etc.; con --todos, cualquier rubro). Abre la portada y hasta dos páginas de productos o
precios, una vez cada una, y anota:
  lista_pdf      publican la lista de precios en PDF o Excel (la mejor señal)
  catalogo_pdf   el catálogo de productos es un PDF para descargar (anota cuánto pesa)
  a_consultar    piden consultar el precio o un presupuesto
  sin_precios    muestran productos sin precios
  con_precios    ya muestran precios en la web
  tienda         ya tienen tienda online (Tiendanube, Mercado Shops, WooCommerce, Shopify...)
Salida: la lista ordenada por «afinidad» con Catálogo vivo, con la frase verificable para el primer mensaje.
"""
import json, os, re, ssl, sys, concurrent.futures as cf
import urllib.request
from urllib.parse import urljoin, urlparse

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
_CA = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
CTX = ssl.create_default_context(cafile=_CA) if _CA else ssl.create_default_context()

# Rubros de OpenStreetMap con catálogos grandes y precios que cambian seguido, con su peso.
RUBROS = {
    "shop=trade": 5, "shop=hardware": 5, "shop=doityourself": 5, "shop=electrical": 5, "shop=paint": 4,
    "shop=bathroom_furnishing": 4, "shop=tiles": 4, "shop=flooring": 4, "shop=car_parts": 4, "shop=tyres": 3,
    "shop=wholesale": 5, "shop=agrarian": 3, "shop=garden_centre": 3, "shop=lighting": 4, "shop=houseware": 3,
    "shop=furniture": 3, "shop=bed": 3, "shop=kitchen": 3, "shop=appliance": 3, "shop=computer": 3,
    "shop=electronics": 3, "shop=bicycle": 2, "shop=motorcycle": 2, "shop=sports": 2, "shop=fishing": 2,
    "shop=outdoor": 2, "shop=medical_supply": 3, "shop=stationery": 3, "shop=books": 2, "shop=fabric": 3,
    "shop=craft": 2, "shop=music": 2, "shop=pet": 2, "shop=gas": 2, "shop=security": 3, "shop=boat": 2,
    "shop=water_sports": 2, "shop=hifi": 2, "shop=interior_decoration": 2, "shop=curtain": 2, "shop=glaziery": 3,
    "office=company": 1, "craft=metal_construction": 2,
}
TIENDA = re.compile(r"tiendanube|nuvemshop|mercadoshops|woocommerce|cdn\.shopify|vtex|prestashop|magento|empretienda|tiendup", re.I)
PRECIO = re.compile(r"\$\s?\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\$\s?\d{4,}|\$\s?\d{2,3},\d{2}")
CONSULTAR = re.compile(r"consult(?:ar|á|e) (?:el )?precio|precio a consultar|solicit(?:ar|á) (?:un )?presupuesto|ped[ií] (?:tu )?presupuesto|cotiz(?:ar|á|ación)|consult(?:ar|á) por precio", re.I)
LINK = re.compile(r"<a\b[^>]*href=[\"']([^\"'#]+)[\"'][^>]*>(.*?)</a>", re.I | re.S)
ARCHIVO = re.compile(r"\.(pdf|xlsx?|xls|csv)(?:$|\?)", re.I)
PALABRA_LISTA = re.compile(r"lista|precio|cat[aá]logo|tarifa", re.I)
ES_LISTA = re.compile(r"lista|precio|tarifa", re.I)   # lo demás («catálogo») es un catálogo, no una lista de precios
PAGINA_PRODUCTOS = re.compile(r"producto|cat[aá]logo|lista[-_ ]de[-_ ]precio|precios|tienda|shop|linea|línea|rubro", re.I)

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9"})
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        body = r.read(1_500_000)
        cs = r.headers.get_content_charset() or "utf-8"
        return r.geturl(), body.decode(cs, "replace")

def texto(h):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h)).strip()

def analizar(row):
    url = row.get("final") or row["web"]
    s = dict(lista_pdf=[], catalogo_pdf=[], a_consultar=False, sin_precios=False, con_precios=False, tienda=False, paginas=[])
    try:
        final, html = fetch(url)
    except Exception as e:
        return dict(row, cat_err=type(e).__name__)
    paginas = [(final, html)]
    host = urlparse(final).netloc
    vistos = {final}
    candidatas = []
    for href, txt in LINK.findall(html):
        absu = urljoin(final, href.strip())
        t = texto(txt)[:80]
        if ARCHIVO.search(absu) and (PALABRA_LISTA.search(absu) or PALABRA_LISTA.search(t)):
            s["lista_pdf"].append({"url": absu, "texto": t})
        elif urlparse(absu).netloc == host and absu not in vistos and (PAGINA_PRODUCTOS.search(href) or PAGINA_PRODUCTOS.search(t)):
            vistos.add(absu); candidatas.append(absu)
    for u in candidatas[:2]:
        try:
            f2, h2 = fetch(u)
            paginas.append((f2, h2))
            for href, txt in LINK.findall(h2):
                absu = urljoin(f2, href.strip())
                t = texto(txt)[:80]
                if ARCHIVO.search(absu) and (PALABRA_LISTA.search(absu) or PALABRA_LISTA.search(t)) and absu not in [x["url"] for x in s["lista_pdf"]]:
                    s["lista_pdf"].append({"url": absu, "texto": t})
        except Exception:
            pass
    s["paginas"] = [p[0] for p in paginas]
    todo = " ".join(h for _, h in paginas)
    plano = texto(todo)
    s["tienda"] = bool(TIENDA.search(todo))
    s["con_precios"] = len(PRECIO.findall(plano)) >= 3
    s["a_consultar"] = bool(CONSULTAR.search(plano))
    s["sin_precios"] = len(paginas) > 1 and not s["con_precios"] and not s["tienda"]
    # Separar listas de precios de catálogos sin precios, y medir el primer catálogo (el peso es un dato concreto).
    archivos, s["lista_pdf"] = s["lista_pdf"], []
    for a in archivos:
        (s["lista_pdf"] if ES_LISTA.search(a["url"]) or ES_LISTA.search(a["texto"]) else s["catalogo_pdf"]).append(a)
    s["lista_pdf"], s["catalogo_pdf"] = s["lista_pdf"][:5], s["catalogo_pdf"][:5]
    if s["catalogo_pdf"]:
        try:
            u = s["catalogo_pdf"][0]["url"].replace(" ", "%20")
            req = urllib.request.Request(u, method="HEAD", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
                s["catalogo_pdf"][0]["bytes"] = int(r.headers.get("Content-Length") or 0)
        except Exception:
            pass
    return dict(row, cat=row["cat"], senales=s)

def afinidad(r):
    s = r.get("senales")
    if not s: return -99
    a = RUBROS.get(r["cat"], 0)
    if s["lista_pdf"]: a += 6
    elif s["catalogo_pdf"]: a += 4
    if s["a_consultar"]: a += 2
    if s["sin_precios"]: a += 2
    if s["con_precios"] and not s["lista_pdf"]: a -= 1
    if s["tienda"]: a -= 4
    a += min(r.get("score", 0), 9) / 3   # web vieja: más fácil de mostrar la mejora
    return round(a, 1)

def frase(r):
    s = r["senales"]
    if s["lista_pdf"]:
        return "publican la lista de precios en un archivo para descargar: en el celular hay que bajarlo y hacer zoom, y cada vez que cambia un precio hay que rehacerlo"
    if s["catalogo_pdf"]:
        mb = (s["catalogo_pdf"][0].get("bytes") or 0) / 1048576
        peso = f" de {mb:.0f} MB" if mb >= 2 else ""
        return f"el catálogo es un PDF{peso} para descargar: en el celular hay que bajarlo entero para ver un solo producto" + ("" if s["con_precios"] else ", y no tiene precios")
    if s["sin_precios"] and s["a_consultar"]:
        return "la web muestra los productos pero sin precios, así que cada consulta termina en un mensaje para preguntar cuánto sale"
    if s["a_consultar"]:
        return "para saber un precio hay que escribirles o pedir presupuesto"
    if s["sin_precios"]:
        return "la web muestra los productos pero sin precios"
    return ""

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    filas = json.load(open(sys.argv[1]))
    todos = "--todos" in sys.argv
    sel = [r for r in filas if r.get("ok") and not r.get("parked") and (todos or r.get("cat") in RUBROS)]
    print(f"{len(sel)} comercios de rubros de catálogo para revisar", flush=True)
    with cf.ThreadPoolExecutor(16) as ex:
        out = list(ex.map(analizar, sel))
    for r in out:
        r["afinidad"] = afinidad(r)
        r["frase_catalogo"] = frase(r) if r.get("senales") else ""
    out.sort(key=lambda r: -r["afinidad"])
    json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
    con = [r for r in out if r.get("senales")]
    print(f"{len(con)} revisados: {sum(1 for r in con if r['senales']['lista_pdf'])} con lista en archivo, "
          f"{sum(1 for r in con if r['senales']['catalogo_pdf'])} con catálogo en PDF, {sum(1 for r in con if r['senales']['tienda'])} con tienda online, {sum(1 for r in con if r['frase_catalogo'])} con observación para el mensaje")
    for r in out[:15]:
        s = r.get("senales") or {}
        print(f"{r['afinidad']:5} {r['name'][:38]:38} {r['cat'][5:][:14]:14} {'LISTA ' if s.get('lista_pdf') else ''}{'CATÁLOGO-PDF ' if s.get('catalogo_pdf') else ''}{'consultar ' if s.get('a_consultar') else ''}{'sin$ ' if s.get('sin_precios') else ''}{'tienda' if s.get('tienda') else ''}")
