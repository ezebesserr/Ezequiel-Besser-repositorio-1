"""Saca de un extracto de OpenStreetMap los negocios que tienen sitio web.

Uso: python3 extract.py BuenosAires.osm.pbf candidatos.json [minlat,minlon,maxlat,maxlon]
Extracto de CABA + GBA: https://download.bbbike.org/osm/bbbike/BuenosAires/BuenosAires.osm.pbf
Necesita: pip install osmium
El recorte opcional filtra por coordenadas (solo puntos; sin recorte entran también los edificios).
"""
import osmium, json, sys, re
from urllib.parse import urlparse

src, out = sys.argv[1], sys.argv[2]
BBOX = [float(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else None
CATS = ("shop","craft","office","amenity","healthcare","tourism","leisure")
SKIP_AMENITY = {"school","university","college","hospital","place_of_worship","police","fire_station",
  "townhall","courthouse","library","bank","atm","fuel","parking","post_office","bus_station",
  "public_building","community_centre","social_facility","kindergarten","embassy","prison","toilets"}
BIG = re.compile(r"(facebook|instagram|wa\.me|whatsapp|linktr|google|mercadolibre|carrefour|coto|dia\.com|"
  r"jumbo|disco\.com|farmacity|mcdonald|burgerking|starbucks|ypf|shell|axion|santander|galicia|bbva|"
  r"macro|hsbc|icbc|patagonia|nacion|ciudad|gob\.ar|gov\.ar|edu\.ar|wikipedia|tripadvisor|booking|"
  r"havanna|freddo|grido|easy\.com|sodimac|garbarino|fravega|musimundo|rapipago|pagofacil|lacoste|"
  r"nike|adidas|samsung|apple|personal\.com|claro|movistar|telecom|correo|andreani|oca\.com|"
  r"mostaza|wendys|kfc|subway|bonafide|cafemartinez|lavirginia|pedidosya|rappi|vea\.com|chango|"
  r"hiperlibertad|walmart|cencosud|osde|swiss|galeno|medife|omint|sancor|hipotecario|supervielle|"
  r"credicoop|comafi|bancor|ciudad\.com|pizzahut|dominos|blogspot\.com/$)", re.I)

class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.rows=[]
    def handle(self, o, kind):
        t = {tag.k: tag.v for tag in o.tags}
        web = t.get("website") or t.get("contact:website") or t.get("url")
        if not web: return
        cat = next((f"{k}={t[k]}" for k in CATS if k in t), None)
        if not cat: return
        if t.get("amenity") in SKIP_AMENITY: return
        if "brand" in t or "brand:wikidata" in t: return
        web = web.split(";")[0].strip()
        if not web.startswith("http"): web = "http://" + web
        host = urlparse(web).netloc.lower()
        if not host or BIG.search(web): return
        loc = None
        try:
            if kind=="n": loc=(o.location.lat, o.location.lon)
        except Exception: pass
        if BBOX and (not loc or not (BBOX[0] <= loc[0] <= BBOX[2] and BBOX[1] <= loc[1] <= BBOX[3])): return
        self.rows.append(dict(id=f"{kind}{o.id}", name=t.get("name",""), cat=cat, web=web, host=host,
            street=t.get("addr:street",""), num=t.get("addr:housenumber",""),
            city=t.get("addr:city","") or t.get("addr:suburb",""),
            phone=t.get("phone") or t.get("contact:phone",""), email=t.get("email") or t.get("contact:email",""),
            loc=loc))
    def node(self,n): self.handle(n,"n")
    def way(self,w): self.handle(w,"w")

h=H(); h.apply_file(src)
seen=set(); rows=[]
for r in h.rows:
    if r["host"] in seen: continue
    seen.add(r["host"]); rows.append(r)
json.dump(rows, open(out,"w"), ensure_ascii=False, indent=0)
print(len(h.rows), "con web;", len(rows), "dominios unicos")
from collections import Counter
print(Counter(r["cat"].split("=")[0] for r in rows).most_common())
