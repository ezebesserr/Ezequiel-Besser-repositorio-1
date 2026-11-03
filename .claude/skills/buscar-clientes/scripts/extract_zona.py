"""Saca negocios con web hasta cierta distancia del Obelisco, desde un mapa de OpenStreetMap.

Uso: python3 extract_zona.py mapa.osm.pbf candidatos.json [radio_km] [ya_revisados.json]
Mapa de toda la provincia de Buenos Aires (unos 100 MB):
  https://download.openstreetmap.fr/extracts/south-america/argentina/buenos_aires-latest.osm.pbf
ya_revisados.json (opcional): lista de dominios que no hace falta volver a escanear.
Necesita: pip install osmium
"""
import json, math, re, sys
from urllib.parse import urlparse
import osmium
src, out = sys.argv[1], sys.argv[2]
RADIO = float(sys.argv[3]) if len(sys.argv) > 3 else 75.0
known = {h.lower().removeprefix("www.") for h in json.load(open(sys.argv[4]))} if len(sys.argv) > 4 else set()
O = (-34.6037, -58.3816)
def km(a, b):
    dy = (a[0]-b[0]) * 111.2; dx = (a[1]-b[1]) * 111.2 * math.cos(math.radians(a[0])); return math.hypot(dx, dy)
CATS = ("shop","craft","office","amenity","healthcare","tourism","leisure")
SKIP_AMENITY = {"school","university","college","hospital","place_of_worship","police","fire_station","townhall","courthouse","library","bank","atm","fuel","parking","post_office","bus_station","public_building","community_centre","social_facility","kindergarten","embassy","prison","toilets"}
BIG = re.compile(r"(facebook|instagram|wa\.me|whatsapp|linktr|google|mercadolibre|carrefour|coto|dia\.com|jumbo|disco\.com|farmacity|mcdonald|burgerking|starbucks|ypf|shell|axion|santander|galicia|bbva|macro|hsbc|icbc|patagonia|nacion|provincia|gba\.gov|gob\.ar|gov\.ar|edu\.ar|wikipedia|tripadvisor|booking|havanna|freddo|grido|easy\.com|sodimac|garbarino|fravega|musimundo|rapipago|pagofacil|personal\.com|claro|movistar|telecom|correo|andreani|oca\.com|mostaza|kfc|subway|bonafide|cafemartinez|pedidosya|rappi|vea\.com|chango|walmart|osde|swiss|galeno|medife|omint|sancor|credicoop|comafi|pizzahut|dominos|blogspot\.com/$)", re.I)
class H(osmium.SimpleHandler):
    def __init__(self): super().__init__(); self.rows = []
    def handle(self, o, kind, loc):
        t = {tag.k: tag.v for tag in o.tags}
        web = t.get("website") or t.get("contact:website") or t.get("url")
        if not web or not loc: return
        cat = next((f"{k}={t[k]}" for k in CATS if k in t), None)
        if not cat or t.get("amenity") in SKIP_AMENITY or "brand" in t or "brand:wikidata" in t: return
        if km(loc, O) > RADIO: return
        web = web.split(";")[0].strip()
        if not web.startswith("http"): web = "http://" + web
        host = urlparse(web).netloc.lower().removeprefix("www.")
        if not host or host in known or BIG.search(web): return
        self.rows.append(dict(id=f"{kind}{o.id}", name=t.get("name",""), cat=cat, web=web, host=host, street=t.get("addr:street",""), num=t.get("addr:housenumber",""),
            city=t.get("addr:city","") or t.get("addr:suburb",""), phone=t.get("phone") or t.get("contact:phone",""), email=t.get("email") or t.get("contact:email",""),
            loc=[round(loc[0], 6), round(loc[1], 6)], km=round(km(loc, O), 1)))
    def node(self, n):
        try: self.handle(n, "n", (n.location.lat, n.location.lon))
        except Exception: pass
    def way(self, w):
        try:
            nd = w.nodes[0]; self.handle(w, "w", (nd.location.lat, nd.location.lon))
        except Exception: pass
h = H(); h.apply_file(src, locations=True)
seen, rows = set(), []
for r in h.rows:
    if r["host"] in seen: continue
    seen.add(r["host"]); rows.append(r)
json.dump(rows, open(out, "w"), ensure_ascii=False)
from collections import Counter
print(len(rows), "negocios nuevos con web dentro de", RADIO, "km")
print("por distancia:", sorted(Counter(int(r["km"] // 15 * 15) for r in rows).items()))
