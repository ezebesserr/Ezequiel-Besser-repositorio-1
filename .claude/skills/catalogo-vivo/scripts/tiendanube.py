"""Pasa la planilla del catálogo (base.csv, base-nueva.csv o catalogo.csv) al archivo de carga masiva de Tiendanube.

Uso: python3 tiendanube.py <planilla.csv> --salida tiendanube.csv [--sin-variantes] [--con-costo] [--marca "Marca"]

- Cada producto (mismo rubro y nombre) sale con sus medidas y materiales como variantes («Medida», «Material»),
  una fila por variante, todas con el mismo «Identificador de URL». Con --sin-variantes, un producto por fila.
- Precios con punto decimal, archivo UTF-8 separado por comas: lo que pide Tiendanube.
- --con-costo carga el costo (columna «Costo», que el cliente no ve). Si no, va vacía.
Antes de importar: crear en el administrador las categorías que lista este script (tienen que coincidir exacto),
cargar un producto a mano y, al importar, revisar en la pantalla de columnas que cada una coincida.
"""
import csv, re, sys, unicodedata
from collections import OrderedDict
from decimal import Decimal, InvalidOperation

COLUMNAS = ["Identificador de URL", "Nombre", "Categorías", "Nombre de propiedad 1", "Valor de propiedad 1",
            "Nombre de propiedad 2", "Valor de propiedad 2", "Nombre de propiedad 3", "Valor de propiedad 3",
            "Precio", "Precio promocional", "Peso (kg)", "Alto (cm)", "Ancho (cm)", "Profundidad (cm)", "Stock", "SKU",
            "Código de barras", "Mostrar en tienda", "Envío sin cargo", "Descripción", "Tags", "Título para SEO",
            "Descripción para SEO", "Marca", "Producto Físico", "MPN (Número de pieza del fabricante)", "Sexo",
            "Rango de edad", "Costo"]

def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:80] or "producto"

def numero(v):
    v = str(v or "").strip().replace("$", "").replace(" ", "")
    if not v: return ""
    if "," in v and "." in v: v = v.replace(".", "").replace(",", ".")
    elif "," in v: v = v.replace(",", ".")
    try:
        return f"{Decimal(v):.2f}"
    except InvalidOperation:
        return ""

def main():
    a = sys.argv[1:]
    if not a or "--salida" not in a:
        print(__doc__); sys.exit(1)
    origen, salida = a[0], a[a.index("--salida") + 1]
    sin_var, con_costo = "--sin-variantes" in a, "--con-costo" in a
    marca = a[a.index("--marca") + 1] if "--marca" in a else ""
    with open(origen, encoding="utf-8-sig") as fh:
        filas = [r for r in csv.DictReader(fh) if (r.get("nombre") or "").strip()]
    if not filas:
        sys.exit("La planilla no tiene productos (hace falta al menos la columna «nombre»).")
    productos = OrderedDict()
    for r in filas:
        clave = (r.get("rubro", "").strip(), r["nombre"].strip()) if not sin_var else (r.get("rubro", "").strip(), r["nombre"].strip(), r.get("medida", ""), r.get("material", ""), r.get("codigo", ""))
        productos.setdefault(clave, []).append(r)
    usados, out, categorias = set(), [], OrderedDict()
    for clave, variantes in productos.items():
        rubro, nombre = clave[0], clave[1]
        cat = rubro[:1].upper() + rubro[1:] if rubro else ""
        if cat: categorias[cat] = categorias.get(cat, 0) + 1
        props = [p for p in ("medida", "material") if len({(v.get(p) or "").strip() for v in variantes}) > 1]
        titulo = nombre if not sin_var else " ".join(x for x in [nombre, variantes[0].get("medida", ""), variantes[0].get("material", "")] if x).strip()
        url = base = slug(titulo)
        n = 2
        while url in usados:
            url = f"{base}-{n}"; n += 1
        usados.add(url)
        materiales = sorted({(v.get("material") or "").strip() for v in variantes} - {""})
        unidades = sorted({(v.get("unidad") or "").strip() for v in variantes} - {""})
        descripcion = titulo + "." + (f" Material: {', '.join(materiales)}." if materiales else "") + (f" Se vende por {', '.join(unidades).lower()}." if unidades else "")
        for v in variantes:
            fila = {c: "" for c in COLUMNAS}
            fila.update({"Identificador de URL": url, "Nombre": titulo, "Categorías": cat, "Precio": numero(v.get("precio")),
                         "SKU": (v.get("codigo") or "").strip(), "Mostrar en tienda": "SI", "Envío sin cargo": "NO",
                         "Descripción": descripcion, "Tags": ", ".join(x for x in [rubro, *materiales] if x),
                         "Título para SEO": titulo[:70], "Descripción para SEO": descripcion[:160], "Marca": marca,
                         "Producto Físico": "SI", "Costo": numero(v.get("costo")) if con_costo else ""})
            for i, p in enumerate(props[:3], start=1):
                fila[f"Nombre de propiedad {i}"] = p.capitalize()
                fila[f"Valor de propiedad {i}"] = (v.get(p) or "").strip()
            out.append(fila)
    sin_precio = [f["SKU"] or f["Nombre"] for f in out if not f["Precio"]]
    with open(salida, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNAS)
        w.writeheader(); w.writerows(out)
    print(f"{len(productos)} productos y {len(out)} filas en {salida}.")
    print("Categorías para crear antes de importar: " + ", ".join(f"{c} ({n})" for c, n in categorias.items()))
    if sin_precio:
        print(f"Ojo: {len(sin_precio)} sin precio (se cargan en $0 o los rechaza): {', '.join(sin_precio[:8])}")
    if len(out) > 20000:
        print("Ojo: Tiendanube acepta hasta 20.000 filas por importación: partí el archivo.")

if __name__ == "__main__":
    main()
