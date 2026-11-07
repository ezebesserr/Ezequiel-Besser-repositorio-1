#!/usr/bin/env python3
"""Arma la planilla del Catálogo vivo, lista para subir a Google Drive.

Uso:
  python3 planilla.py --negocio "Bulonera Tres Hilos" --salida planilla.xlsx \
      [--desde base.csv] [--reglas reglas.json] [--rubros "bulones,tornillos,tuercas"]

Hojas:
- Instrucciones: cómo subirla, qué hoja se publica y qué significa cada columna.
- Base (privada): codigo, rubro, nombre, medida, material, unidad, proveedor, codigo_proveedor, costo, precio, foto.
- Catálogo (la única que se publica): toma de Base todo menos proveedor, código de proveedor y costo, con QUERY.
- Reglas: margen general y por rubro, bonificación e IVA por proveedor, redondeo y alerta. Se baja como CSV y
  se le pasa a precios.py con --reglas.

Con --desde carga los productos de un CSV o Excel que ya tenga esas columnas (por ejemplo, la base de ejemplo).
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from precios import COLUMNAS_BASE, leer_tabla, numero  # noqa: E402

try:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation
except ImportError:
    sys.exit("Hace falta openpyxl: pip install openpyxl")

COLUMNAS = COLUMNAS_BASE + ["foto"]
DESCRIPCION = {
    "codigo": "Código propio del comercio. Es lo que el cliente ve y busca.",
    "rubro": "Rubro en minúscula (bulones, tornillos…). Arma los filtros de la web.",
    "nombre": "Nombre del producto, como lo dicen en el mostrador.",
    "medida": "Medida o variante: M8 × 40, 1/4\", 500 g…",
    "material": "Material o terminación. Opcional.",
    "unidad": "Presentación: Caja x 100, Bolsa x 50, Por unidad…",
    "proveedor": "Nombre del proveedor, igual en todas las filas. No se publica.",
    "codigo_proveedor": "Código del producto en la lista del proveedor. No se publica.",
    "costo": "Lo calcula el actualizador de precios. No se publica.",
    "precio": "Precio de venta en pesos, sin puntos ni signo $.",
    "foto": "Opcional: img/<codigo>.jpg, de menos de 300 KB.",
}
TINTA = "1B1E21"
CABECERA = PatternFill("solid", fgColor="E2E5E6")
PRIVADA = PatternFill("solid", fgColor="FBE3E3")
NEGRITA = Font(bold=True, color=TINTA)


def ancho(ws, col, n):
    ws.column_dimensions[col].width = n


def main():
    p = argparse.ArgumentParser(description="Arma la planilla del Catálogo vivo (.xlsx).")
    p.add_argument("--negocio", required=True)
    p.add_argument("--salida", required=True, help="Ruta del .xlsx a crear")
    p.add_argument("--desde", help="CSV o Excel con productos para cargar en Base")
    p.add_argument("--reglas", help="reglas.json para precargar la hoja Reglas")
    p.add_argument("--rubros", help="Rubros separados por coma, para la lista desplegable")
    args = p.parse_args()

    filas = leer_tabla(args.desde) if args.desde else []
    rubros = [r.strip() for r in (args.rubros or "").split(",") if r.strip()]
    if not rubros:
        rubros = sorted({str(f.get("rubro", "")).strip() for f in filas if f.get("rubro")})
    reglas = {"margen": 45, "margen_por_rubro": {}, "redondeo": 50, "alerta": 15, "bonificacion": 0, "iva_lista": 0}
    if args.reglas:
        with open(args.reglas, encoding="utf-8") as fh:
            reglas.update(json.load(fh))

    wb = Workbook()

    # Instrucciones
    ws = wb.active
    ws.title = "Instrucciones"
    texto = [
        (f"Catálogo de {args.negocio}", True),
        ("", False),
        ("Cómo se usa", True),
        ("1. Subí este archivo a tu Google Drive y abrilo con Hojas de cálculo de Google (Archivo → Guardar como Hojas de cálculo de Google).", False),
        ("2. Cargá o corregí los productos en la hoja Base. Una fila por producto.", False),
        ("3. La hoja Catálogo se arma sola con QUERY: no la edites.", False),
        ("4. Publicá SOLO la hoja Catálogo: Archivo → Compartir → Publicar en la web → elegí «Catálogo» → «Valores separados por comas (.csv)» → Publicar.", False),
        ("5. Mandanos el link que te da Google. La web lee de ahí: cuando cambiás un precio en Base, la web lo muestra a los pocos minutos.", False),
        ("6. Compartinos la planilla como editores para actualizar los precios cuando llegue la lista de cada proveedor.", False),
        ("", False),
        ("Importante", True),
        ("Nunca publiques la hoja Base: tiene tus costos y los códigos de tus proveedores. Las columnas en rojo no salen en la web.", False),
        ("Si Catálogo muestra un error al abrirla en Google, escribí en A1: =QUERY(Base!A:K; \"select A, B, C, D, E, F, J, K where A is not null\"; 1)", False),
        ("En Reglas van tus márgenes y bonificaciones: nosotros los usamos para calcular los precios nuevos y te mandamos qué cambió antes de publicar.", False),
        ("", False),
        ("Qué va en cada columna de Base", True),
    ] + [(f"{c}: {DESCRIPCION[c]}", False) for c in COLUMNAS]
    for i, (t, negrita) in enumerate(texto, start=1):
        celda = ws.cell(row=i, column=1, value=t)
        celda.alignment = Alignment(wrap_text=True, vertical="top")
        if negrita:
            celda.font = Font(bold=True, size=14 if i == 1 else 12, color=TINTA)
    ancho(ws, "A", 110)

    # Base
    base = wb.create_sheet("Base")
    for j, c in enumerate(COLUMNAS, start=1):
        celda = base.cell(row=1, column=j, value=c)
        celda.font = NEGRITA
        celda.fill = PRIVADA if c in ("proveedor", "codigo_proveedor", "costo") else CABECERA
    for i, f in enumerate(filas, start=2):
        for j, c in enumerate(COLUMNAS, start=1):
            v = f.get(c, "")
            if c in ("costo", "precio"):
                n = numero(v)
                v = float(n) if n is not None else None
            base.cell(row=i, column=j, value=v)
    base.freeze_panes = "A2"
    for col, w in zip("ABCDEFGHIJK", (12, 14, 42, 16, 18, 16, 20, 18, 12, 12, 22)):
        ancho(base, col, w)
    for col in ("I", "J"):
        for fila in range(2, max(len(filas) + 2, 3000)):
            base[f"{col}{fila}"].number_format = "#,##0"
    if rubros:
        dv = DataValidation(type="list", formula1='"' + ",".join(rubros)[:250] + '"', allow_blank=True,
                            showErrorMessage=False, prompt="Elegí un rubro de la lista o escribí uno nuevo.")
        base.add_data_validation(dv)
        dv.add("B2:B3000")
    num = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True,
                         error="El precio va en pesos, sin puntos ni $.", showErrorMessage=True)
    base.add_data_validation(num)
    num.add("I2:J3000")

    # Catálogo (lo que se publica)
    cat = wb.create_sheet("Catálogo")
    cat["A1"] = '=QUERY(Base!A:K,"select A, B, C, D, E, F, J, K where A is not null",1)'
    cat["A1"].font = NEGRITA
    for col, w in zip("ABCDEFGH", (12, 14, 42, 16, 18, 16, 12, 22)):
        ancho(cat, col, w)

    # Reglas
    rg = wb.create_sheet("Reglas")
    for j, c in enumerate(("tipo", "clave", "valor", "qué es"), start=1):
        rg.cell(row=1, column=j, value=c).font = NEGRITA
        rg.cell(row=1, column=j).fill = CABECERA
    filas_reglas = [("margen", "", reglas.get("margen", 45), "Margen general, en %")]
    filas_reglas += [("margen_rubro", r, v, "Margen de ese rubro, en %") for r, v in (reglas.get("margen_por_rubro") or {}).items()]
    if reglas.get("bonificacion"):
        filas_reglas.append(("bonificacion", "", reglas["bonificacion"], "Descuento sobre la lista, en %. Con proveedor en «clave», solo para ese proveedor"))
    else:
        filas_reglas.append(("bonificacion", "<proveedor>", 0, "Descuento de ese proveedor sobre su lista, en %"))
    filas_reglas += [
        ("iva_lista", "", reglas.get("iva_lista", 0), "IVA a sumar si la lista viene «+ IVA», en % (21 o 10,5)"),
        ("redondeo", "", reglas.get("redondeo", 50), "Redondeo hacia arriba, en pesos"),
        ("alerta", "", reglas.get("alerta", 15), "Cambios de precio desde este % se revisan a mano"),
    ]
    for i, fila in enumerate(filas_reglas, start=2):
        for j, v in enumerate(fila, start=1):
            rg.cell(row=i, column=j, value=v)
    for col, w in zip("ABCD", (16, 22, 10, 70)):
        ancho(rg, col, w)
    rg.freeze_panes = "A2"

    wb.active = 1
    os.makedirs(os.path.dirname(os.path.abspath(args.salida)) or ".", exist_ok=True)
    wb.save(args.salida)
    print(f"Planilla lista: {args.salida} ({len(filas)} productos, {len(rubros)} rubros en la lista).")
    print("Subila a Google Drive, abrila con Hojas de cálculo y publicá solo la hoja Catálogo como CSV (ver Instrucciones).")


if __name__ == "__main__":
    main()
