"""Ubica cada negocio en su barrio (CABA) o localidad y partido (GBA) con Nominatim.

Uso: python3 geo.py preseleccion.json zonas.json [índices separados por coma]
Respeta el límite de Nominatim: una consulta por segundo.
"""
import json, os, ssl, sys, time, urllib.parse, urllib.request

_CA = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
CTX = ssl.create_default_context(cafile=_CA) if _CA else ssl.create_default_context()
H = {"User-Agent": "creador-paginas-web/1.0 (prospeccion de comercios)"}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=20, context=CTX) as r:
        return json.loads(r.read())

rows = json.load(open(sys.argv[1]))
sel = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else range(len(rows))
out = {}
for i in sel:
    r = rows[i]
    try:
        if r.get("loc"):
            lat, lon = r["loc"]
        else:
            q = f'{r.get("street","")} {r.get("num","")}, {r.get("city") or "Buenos Aires"}, Argentina'
            res = get("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + urllib.parse.quote(q)); time.sleep(1.1)
            if not res:
                out[i] = {}; continue
            lat, lon = float(res[0]["lat"]), float(res[0]["lon"])
        a = get(f"https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&lat={lat}&lon={lon}")["address"]; time.sleep(1.1)
        if a.get("state", "").startswith("Ciudad"):
            barrio = a.get("suburb") or a.get("neighbourhood") or a.get("quarter") or ""
            zona, area = f"{barrio} · CABA", "CABA"
        else:
            loc = a.get("city") or a.get("town") or a.get("suburb") or a.get("village") or ""
            partido = (a.get("state_district") or a.get("county") or "").replace("Partido de ", "").replace("Partido del ", "")
            zona, area = (loc if not partido or partido == loc else f"{loc} · {partido}"), "GBA"
        out[i] = {"zona": zona, "area": area, "lat": lat, "lon": lon}
    except Exception as e:
        out[i] = {"error": str(e)[:100]}
    print(i, r.get("name", ""), out[i], flush=True)
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
