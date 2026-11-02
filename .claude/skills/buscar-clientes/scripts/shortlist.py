"""Filtra negocios (saca plazas, museos, embajadas, fichas de terceros) y ordena por puntaje.

Uso: python3 shortlist.py escaneados.json preseleccion.json PUNTAJE_MINIMO   (6 u 8 andan bien)
"""
import json, sys, re
from urllib.parse import urlparse
rows = json.load(open(sys.argv[1]))
NONCOM = re.compile(r"^(tourism=(artwork|attraction|museum|information|viewpoint|gallery|picnic_site|camp_site)|"
    r"leisure=(park|playground|garden|pitch|nature_reserve|stadium|track|dog_park|common)|"
    r"amenity=(monastery|place_of_worship|grave_yard|theatre|arts_centre|cinema|social_centre|shelter|clock|"
    r"fountain|marketplace|events_venue|conference_centre|planetarium|studio|public_bookcase)|"
    r"office=(diplomatic|government|ngo|association|religion|political_party|union|educational_institution|foundation|research))")
THIRD = re.compile(r"(alternativateatral|todo-argentina|rosario\.com\.ar|museode|arcondebuenosaires|hostelclub|"
    r"hostelworld|despegar|guiaoleo|restorando|tenedor|paginasamarillas|argentino\.com\.ar|cylex|yelp|foursquare)", re.I)
def regdom(h):
    h = h.lower().removeprefix("www.")
    return h
out, seen = [], set()
for r in rows:
    if not r["ok"] or r.get("parked") or r["score"] < int(sys.argv[3]): continue
    if NONCOM.match(r["cat"]) or THIRD.search(r["final"]): continue
    p = urlparse(r["final"])
    if p.path.count("/") > 2 or p.query and "codigo" in p.query: continue
    d = regdom(p.netloc)
    if d in seen or r["name"].lower() in seen: continue
    seen.add(d); seen.add(r["name"].lower())
    out.append(r)
out.sort(key=lambda r: -r["score"])
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=0)
print(len(out))
from collections import Counter
print(Counter(r["score"] for r in out).most_common())
