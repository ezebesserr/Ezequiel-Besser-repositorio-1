"""Ordena las facturas electrónicas de un cliente del estudio: lee los PDF y arma la planilla (idea NIC-03).

Uso: python3 facturas.py <carpeta con PDF> --salida <carpeta-privada> [--renombrar]

Para cada PDF busca primero el link del QR de ARCA/AFIP (trae fecha, CUIT, punto de venta, tipo, número, importe y CAE
exactos) y, si no está, lee el texto de la factura. Deja:
  comprobantes.xlsx   una fila por comprobante + resumen por mes y por emisor; en rojo lo que hay que revisar
  comprobantes.csv    lo mismo, para importar en otro sistema
  ordenados/          (con --renombrar) copias con nombre AAAA-MM-DD_CUIT_tipo_PV-número.pdf, por mes
Nunca borra ni mueve los originales. Un importe que no se pudo leer con seguridad queda marcado: se revisa a mano.
"""
import base64, csv, json, os, re, shutil, sys
from pypdf import PdfReader

TIPOS = {1: ("Factura", "A"), 2: ("Nota de débito", "A"), 3: ("Nota de crédito", "A"), 6: ("Factura", "B"), 7: ("Nota de débito", "B"),
         8: ("Nota de crédito", "B"), 11: ("Factura", "C"), 12: ("Nota de débito", "C"), 13: ("Nota de crédito", "C"),
         51: ("Factura", "M"), 19: ("Factura", "E"), 201: ("Factura de crédito electrónica", "A"), 206: ("Factura de crédito electrónica", "B"),
         211: ("Factura de crédito electrónica", "C")}
QR = re.compile(r"https?://(?:www\.)?(?:afip|arca)\.gob\.ar/fe/qr/?\?p=([A-Za-z0-9+/=_%-]+)")

def importe(s):
    s = (s or "").strip().replace("$", "").replace(" ", "")
    if not s: return None
    if "," in s and "." in s: s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s: s = s.replace(",", ".")
    try: return round(float(s), 2)
    except ValueError: return None

def desde_qr(reader, texto):
    links = []
    for pg in reader.pages:
        for a in pg.get("/Annots") or []:
            o = a.get_object(); act = o.get("/A")
            if act and act.get_object().get("/URI"): links.append(str(act.get_object()["/URI"]))
    for u in links + [texto]:
        m = QR.search(u)
        if not m: continue
        p = m.group(1).replace("%3D", "=").replace("%2B", "+").replace("%2F", "/")
        try:
            d = json.loads(base64.b64decode(p + "=" * (-len(p) % 4), altchars=b"-_" if "-" in p or "_" in p else None))
        except Exception:
            continue
        tipo, letra = TIPOS.get(int(d.get("tipoCmp", 0)), (f"Tipo {d.get('tipoCmp')}", ""))
        return dict(fecha=d.get("fecha", ""), tipo=tipo, letra=letra, punto_venta=int(d.get("ptoVta", 0)), numero=int(d.get("nroCmp", 0)),
                    cuit_emisor=str(d.get("cuit", "")), cuit_receptor=str(d.get("nroDocRec", "") or ""), total=float(d.get("importe", 0)),
                    moneda=d.get("moneda", "PES"), cae=str(d.get("codAut", "")), fuente="QR")
    return None

def desde_texto(t):
    r = dict(fuente="texto")
    m = re.search(r"\b(FACTURA|NOTA DE CR[ÉE]DITO|NOTA DE D[ÉE]BITO|RECIBO)\b", t, re.I)
    r["tipo"] = m.group(1).capitalize().replace("Nota de cr", "Nota de cr") if m else ""
    m = re.search(r"\bC[OÓ]D(?:IGO)?\.?\s*N?[°º]?\s*0*(\d{1,3})\b", t, re.I)
    if m and int(m.group(1)) in TIPOS: r["tipo"], r["letra"] = TIPOS[int(m.group(1))]
    else:
        m = re.search(r"\b(?:FACTURA|NOTA DE CR[ÉE]DITO|NOTA DE D[ÉE]BITO)\s+([ABCME])\b", t, re.I) or re.search(r"(?m)^\s*([ABC])\s*$", t)
        r["letra"] = m.group(1).upper() if m else ""
    m = re.search(r"Punto de Venta:?\s*(\d{1,5})", t, re.I); r["punto_venta"] = int(m.group(1)) if m else None
    m = re.search(r"Comp\.?\s*Nro:?\s*(\d{1,8})", t, re.I); r["numero"] = int(m.group(1)) if m else None
    m = re.search(r"Fecha de Emisi[oó]n:?\s*(\d{2})/(\d{2})/(\d{4})", t, re.I)
    r["fecha"] = f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ""
    cuits = re.findall(r"CUIT:?\s*(\d{2}-?\d{8}-?\d)", t, re.I)
    cuits = [c.replace("-", "") for c in cuits]
    r["cuit_emisor"] = cuits[0] if cuits else ""
    r["cuit_receptor"] = cuits[1] if len(cuits) > 1 else ""
    m = re.search(r"Raz[oó]n Social:?\s*([^\n]{3,80})", t, re.I); r["razon_social"] = m.group(1).strip() if m else ""
    m = re.search(r"Importe Total:?\s*\$?\s*([\d.,]+)", t, re.I); r["total"] = importe(m.group(1)) if m else None
    m = re.search(r"Importe Neto Gravado:?\s*\$?\s*([\d.,]+)", t, re.I) or re.search(r"Subtotal:?\s*\$?\s*([\d.,]+)", t, re.I)
    r["neto"] = importe(m.group(1)) if m else None
    ivas = [importe(x) for x in re.findall(r"IVA\s*\d{1,2}(?:[.,]\d)?\s*%:?\s*\$?\s*([\d.,]+)", t, re.I)]
    r["iva"] = round(sum(x for x in ivas if x), 2) if ivas else None
    m = re.search(r"CAE\s*N?[°º]?:?\s*(\d{14})", t, re.I); r["cae"] = m.group(1) if m else ""
    m = re.search(r"Vto\.?\s*de\s*CAE:?\s*(\d{2}/\d{2}/\d{4})", t, re.I); r["vto_cae"] = m.group(1) if m else ""
    return r

def cuit_valido(c):
    if not re.fullmatch(r"\d{11}", c or ""): return False
    w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]; s = sum(int(c[i]) * w[i] for i in range(10)); v = 11 - s % 11
    return int(c[10]) == (0 if v == 11 else 9 if v == 10 else v)

def main():
    a = sys.argv[1:]
    if not a or "--salida" not in a:
        print(__doc__); sys.exit(1)
    carpeta, salida = a[0], os.path.abspath(a[a.index("--salida") + 1])
    repo = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    if salida == repo or salida.startswith(repo + os.sep):
        sys.exit("La salida va fuera del repo, que es público.")
    os.makedirs(salida, exist_ok=True)
    pdfs = sorted(os.path.join(r, f) for r, _, fs in os.walk(carpeta) for f in fs if f.lower().endswith(".pdf"))
    filas = []
    for f in pdfs:
        try:
            rd = PdfReader(f); t = "\n".join((p.extract_text() or "") for p in rd.pages[:3])
        except Exception as e:
            filas.append(dict(archivo=os.path.basename(f), revisar=f"no se pudo abrir ({type(e).__name__})")); continue
        txt = desde_texto(t); qr = desde_qr(rd, t)
        r = dict(txt, **{k: v for k, v in (qr or {}).items() if v not in ("", None)})
        r["archivo"] = os.path.relpath(f, carpeta)
        motivos = []
        if not r.get("fecha"): motivos.append("sin fecha")
        if r.get("total") is None: motivos.append("sin total")
        if r.get("cuit_emisor") and not cuit_valido(r["cuit_emisor"]): motivos.append("CUIT emisor inválido")
        if not r.get("cuit_emisor"): motivos.append("sin CUIT emisor")
        if qr and txt.get("total") is not None and abs((txt["total"] or 0) - qr["total"]) > 0.01: motivos.append(f"el texto dice {txt['total']} y el QR {qr['total']}")
        if r.get("neto") is not None and r.get("iva") is not None and r.get("total") is not None and abs(r["neto"] + r["iva"] - r["total"]) > 1 and r.get("letra") == "A":
            motivos.append("neto + IVA no da el total (puede haber percepciones)")
        if not qr: motivos.append("sin QR: leído del texto")
        r["revisar"] = "; ".join(motivos)
        filas.append(r)
    cols = ["archivo", "fecha", "tipo", "letra", "punto_venta", "numero", "cuit_emisor", "razon_social", "cuit_receptor", "neto", "iva", "total", "moneda", "cae", "vto_cae", "fuente", "revisar"]
    with open(os.path.join(salida, "comprobantes.csv"), "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, delimiter=";", extrasaction="ignore"); w.writeheader(); w.writerows(filas)
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill
        wb = Workbook(); ws = wb.active; ws.title = "Comprobantes"; ws.append(cols)
        for c in ws[1]: c.font = Font(bold=True)
        rojo = PatternFill("solid", fgColor="FDE2E1")
        for r in filas:
            ws.append([r.get(c, "") for c in cols])
            if r.get("revisar") and r["revisar"] != "sin QR: leído del texto":
                for c in ws[ws.max_row]: c.fill = rojo
        res = wb.create_sheet("Resumen"); res.append(["Mes", "Emisor (CUIT)", "Comprobantes", "Total"])
        agg = {}
        for r in filas:
            k = ((r.get("fecha") or "")[:7] or "sin fecha", r.get("cuit_emisor") or "?")
            n, t = agg.get(k, (0, 0.0)); agg[k] = (n + 1, t + (r.get("total") or 0))
        for (mes, cuit), (n, t) in sorted(agg.items()): res.append([mes, cuit, n, round(t, 2)])
        wb.save(os.path.join(salida, "comprobantes.xlsx"))
    except ImportError:
        print("Sin openpyxl: dejé solo el CSV (pip install openpyxl).")
    if "--renombrar" in a:
        for r in filas:
            if not r.get("fecha"): continue
            nombre = f"{r['fecha']}_{r.get('cuit_emisor') or 'sin-cuit'}_{(r.get('tipo') or 'comp').split()[0].lower()}{r.get('letra') or ''}_{r.get('punto_venta') or 0:05d}-{r.get('numero') or 0:08d}.pdf"
            dest = os.path.join(salida, "ordenados", r["fecha"][:7]); os.makedirs(dest, exist_ok=True)
            shutil.copy2(os.path.join(carpeta, r["archivo"]), os.path.join(dest, nombre))
    rev = [r for r in filas if r.get("revisar") and r["revisar"] != "sin QR: leído del texto"]
    print(f"{len(filas)} comprobantes ({sum(1 for r in filas if r.get('fuente') == 'QR')} por QR), {len(rev)} para revisar. Planilla: {os.path.join(salida, 'comprobantes.xlsx')}")
    for r in rev[:10]: print(f"  revisar {r['archivo']}: {r['revisar']}")

if __name__ == "__main__":
    main()
