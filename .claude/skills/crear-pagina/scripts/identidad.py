"""Saca la identidad visual de un negocio, para que su web salga de lo que el local ya es.

Uso:
  python3 identidad.py <url-de-su-web> [carpeta-salida]
  python3 identidad.py foto-del-cartel.jpg logo.png ...   (fotos que pase el cliente)

Devuelve:
  - los colores de su logo, sus imágenes y los que ya usa su web, con el peso de cada uno;
  - una paleta sugerida (principal, acento, fondo, texto) con el contraste revisado;
  - datos reales para los textos: nombre, desde qué año están, frases y secciones de su web.
Necesita Pillow. Las imágenes que baja quedan en la carpeta de salida (fuera del repo).
"""
import colorsys
import html
import io
import json
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
from collections import Counter

from PIL import Image

_CA = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
CTX = ssl.create_default_context(cafile=_CA) if _CA else ssl.create_default_context()
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"


def bajar(url, limite=5_000_000):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
        return r.read(limite), r.headers.get("Content-Type", ""), r.geturl()


def hexa(rgb):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(c))) for c in rgb)


def rgb_de(hx):
    hx = hx.lstrip("#")
    if len(hx) == 3:
        hx = "".join(c * 2 for c in hx)
    return tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))


def luminancia(rgb):
    def canal(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)


def contraste(a, b):
    la, lb = luminancia(a), luminancia(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hls(rgb):
    return colorsys.rgb_to_hls(*(c / 255 for c in rgb))


def es_neutro(rgb):
    _, l, s = hls(rgb)
    return s < 0.16 or l > 0.93 or l < 0.07


def mezclar(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


def colores_imagen(datos):
    im = Image.open(io.BytesIO(datos))
    im.seek(0)
    im = im.convert("RGBA")
    im.thumbnail((160, 160))
    fondo = Image.new("RGBA", im.size, (255, 255, 255, 255))
    fondo.alpha_composite(im)
    q = fondo.convert("RGB").quantize(colors=10, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    total = im.size[0] * im.size[1]
    return [(tuple(pal[i * 3:i * 3 + 3]), n / total) for n, i in sorted(q.getcolors(), reverse=True)]


def clave(rgb):
    return tuple(int(c) // 24 for c in rgb)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)
    es_url = args[0].startswith("http")
    salida = args[1] if es_url and len(args) > 1 else ("identidad-" + (urllib.parse.urlparse(args[0]).netloc or "fotos").replace("www.", ""))
    os.makedirs(salida, exist_ok=True)
    pesos, muestras, fuentes = Counter(), {}, {}
    datos_texto = {}

    def sumar(rgb, peso, origen):
        k = clave(rgb)
        pesos[k] += peso
        muestras.setdefault(k, []).append(rgb)
        fuentes.setdefault(k, set()).add(origen)

    imagenes = []
    if es_url:
        crudo, _, final = bajar(args[0])
        h = crudo.decode("utf-8", "replace")
        if re.search(r"(?i)one moment, please|just a moment|attention required|checking your browser", h[:5000]):
            datos_texto["aviso"] = "La web pidió una verificación anti-robots y no mostró su contenido. Usá fotos del cartel, el logo o la fachada (python3 identidad.py foto.jpg)."
        texto = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"(?is)<(script|style).*?</\1>", " ", h))))
        m = re.search(r"(?is)<title[^>]*>(.*?)</title>", h)
        datos_texto["titulo"] = html.unescape(re.sub(r"\s+", " ", m.group(1))).strip() if m else ""
        datos_texto["titulos"] = list(dict.fromkeys(
            html.unescape(re.sub(r"<[^>]+>|\s+", " ", x)).strip() for x in re.findall(r"(?is)<h[1-3][^>]*>(.*?)</h[1-3]>", h)))[:12]
        datos_texto["menu"] = list(dict.fromkeys(
            t for t in (html.unescape(re.sub(r"<[^>]+>|\s+", " ", x)).strip() for x in re.findall(r"(?is)<a[^>]*>(.*?)</a>", h))
            if 2 < len(t) < 32))[:25]
        datos_texto["trayectoria"] = list(dict.fromkeys(
            m.group(0) for m in re.finditer(r"(?i)(desde (el año )?(19|20)\d\d|fundad[oa] en (19|20)\d\d|m[aá]s de \d{1,3} años|\d{1,3} años de (experiencia|trayectoria))", texto)))[:6]
        datos_texto["telefonos"] = list(dict.fromkeys(re.findall(r"(?:\+?54\s?)?(?:\(?0?11\)?[\s.-]?)?(?:15[\s.-]?)?[2-7]\d{3}[\s.-]\d{4}", texto)))[:5]
        # colores que ya usa la web (atributos y estilos)
        css = " ".join(re.findall(r"(?is)<style[^>]*>(.*?)</style>", h)) + " " + " ".join(re.findall(r'(?i)(?:style|bgcolor|color|fill)=["\']([^"\']+)["\']', h))
        for hx in re.findall(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", css):
            sumar(rgb_de(hx), 0.08, "su web")
        # imágenes candidatas: logo primero
        for tag in re.findall(r"(?is)<img[^>]+>", h):
            s = re.search(r'(?i)src=["\']?([^"\' >]+)', tag)
            if s:
                imagenes.append((urllib.parse.urljoin(final, s.group(1)), 3 if re.search(r"(?i)logo|marca|brand", tag) else 1))
        for patron, peso in [(r'(?i)<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', 2),
                             (r'(?i)<link[^>]+rel=["\'][^"\']*(?:apple-touch-icon|icon)[^"\']*["\'][^>]+href=["\']([^"\']+)', 2),
                             (r'(?i)url\(["\']?([^"\')]*logo[^"\')]*)', 3)]:
            for u in re.findall(patron, h):
                imagenes.append((urllib.parse.urljoin(final, u), peso))
        vistos, lista = set(), []
        for u, p in sorted(imagenes, key=lambda x: -x[1]):
            if u not in vistos and not u.lower().endswith((".swf",)):
                vistos.add(u)
                lista.append((u, p))
        imagenes = lista[:14]
    else:
        imagenes = [(a, 3) for a in args]

    usadas = []
    for i, (src, peso) in enumerate(imagenes):
        try:
            if src.startswith("http"):
                datos, tipo, _ = bajar(src, 3_000_000)
            else:
                datos, tipo = open(src, "rb").read(), ""
            if src.lower().endswith(".svg") or "svg" in tipo:
                for hx in re.findall(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", datos.decode("utf-8", "replace")):
                    sumar(rgb_de(hx), 0.5 * peso, "logo SVG")
                usadas.append(src)
                continue
            cols = colores_imagen(datos)
            nombre = os.path.join(salida, f"img{i:02d}" + (os.path.splitext(urllib.parse.urlparse(src).path)[1][:5] or ".img"))
            open(nombre, "wb").write(datos)
            origen = "logo" if peso >= 3 else "imagen"
            for rgb, prop in cols:
                sumar(rgb, prop * peso, origen)
            usadas.append(src)
        except Exception:
            pass

    filas = []
    for k, w in pesos.most_common():
        ms = muestras[k]
        rgb = tuple(sum(c[j] for c in ms) / len(ms) for j in range(3))
        filas.append({"hex": hexa(rgb), "peso": round(w, 3), "neutro": es_neutro(rgb), "de": sorted(fuentes[k])})
    con_color = [f for f in filas if not f["neutro"]]

    propios = [f for f in con_color if set(f["de"]) - {"su web"}] or con_color
    solo_web = [f["hex"] for f in con_color if f not in propios][:5]
    paleta = {}
    if propios:
        con_color = propios
        base = rgb_de(con_color[0]["hex"])
        h0, l0, s0 = hls(base)
        if l0 > 0.55:
            base = mezclar(base, (0, 0, 0), (l0 - 0.42) / l0)
        acento = None
        for f in con_color[1:]:
            h1, l1, s1 = hls(rgb_de(f["hex"]))
            if min(abs(h1 - h0), 1 - abs(h1 - h0)) > 0.1 and 0.3 <= l1 <= 0.8 and s1 >= 0.3:
                acento = rgb_de(f["hex"])
                break
        if acento is None:
            acento = mezclar(rgb_de(con_color[0]["hex"]), (255, 255, 255), 0.55)
        fondo = mezclar(base, (255, 255, 255), 0.94)
        texto = mezclar(base, (0, 0, 0), 0.82)
        blanco, negro = (255, 255, 255), (20, 20, 20)
        paleta = {
            "principal": hexa(base), "acento": hexa(acento), "fondo": hexa(fondo), "texto": hexa(texto),
            "texto_sobre_principal": "blanco" if contraste(blanco, base) >= contraste(negro, base) else "oscuro",
            "texto_sobre_acento": "blanco" if contraste(blanco, acento) >= contraste(negro, acento) else "oscuro",
            "contraste_texto_fondo": round(contraste(texto, fondo), 1),
            "contraste_blanco_principal": round(contraste(blanco, base), 1),
        }

    informe = {"fuente": args, "imagenes_analizadas": usadas, "colores": filas[:14], "paleta_sugerida": paleta, "datos_para_textos": datos_texto}
    json.dump(informe, open(os.path.join(salida, "identidad.json"), "w"), ensure_ascii=False, indent=2)

    print(f"# Identidad de {datos_texto.get('titulo') or args[0]}\n")
    print(f"Imágenes analizadas: {len(usadas)} · detalle en {os.path.join(salida, 'identidad.json')}\n")
    print("## Colores propios (de más a menos presentes)")
    for f in [f for f in filas if not f["neutro"] and f["hex"] not in solo_web][:6]:
        print(f"- {f['hex']}  peso {f['peso']}  (de: {', '.join(f['de'])})")
    if solo_web:
        print(f"- Usados en su web vieja (pueden ser de la plantilla y no de la marca): {', '.join(solo_web)}")
    neutros = [f["hex"] for f in filas if f["neutro"]][:4]
    if neutros:
        print(f"- Neutros: {', '.join(neutros)}")
    if paleta:
        print("\n## Paleta sugerida (punto de partida, ajustala a ojo)")
        for k in ("principal", "acento", "fondo", "texto"):
            print(f"- {k}: {paleta[k]}")
        print(f"- Texto sobre el principal: {paleta['texto_sobre_principal']} · sobre el acento: {paleta['texto_sobre_acento']}")
        print(f"- Contraste texto/fondo: {paleta['contraste_texto_fondo']}:1 · blanco/principal: {paleta['contraste_blanco_principal']}:1 (mínimo 4.5)")
    else:
        print("\nNo encontré colores propios: pedí fotos del cartel, la fachada o el logo.")
    if datos_texto:
        print("\n## Datos reales para los textos")
        for k, v in datos_texto.items():
            if v:
                print(f"- {k}: {v if isinstance(v, str) else ' · '.join(v)}")


if __name__ == "__main__":
    main()
