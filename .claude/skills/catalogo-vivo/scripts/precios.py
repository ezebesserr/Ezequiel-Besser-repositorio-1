#!/usr/bin/env python3
"""Actualiza los precios de un catálogo con la lista nueva de un proveedor.

Uso:
  python3 precios.py --base base.csv --lista lista.csv --proveedor "Fijaciones Delta" \
      --salida carpeta/ [--reglas reglas.json] [--bonificacion 30] [--iva-lista 0] \
      [--margen 45] [--redondeo 50] [--alerta 15] [--negocio "Bulonera Tres Hilos"] \
      [--fecha-lista 2026-11-03] [--muestra] [--og-image URL]

Entradas
- base.csv (PRIVADA, nunca se publica): codigo, rubro, nombre, medida, material, unidad,
  proveedor, codigo_proveedor, costo, precio y, si hay, foto.
- La lista del proveedor (.csv o .xlsx) con tres columnas: codigo_proveedor, descripcion y
  precio_lista. Si llega en PDF o con otro formato, Claude la pasa a esas columnas antes
  (ver SKILL.md). Acepta números como 18.462,50 o 18462.50.
- reglas.json (opcional): {"margen": 45, "margen_por_rubro": {"tuercas": 55},
  "redondeo": 50, "bonificacion": 30, "iva_lista": 0, "alerta": 15}.
  Lo que se pase por la línea de comandos manda sobre el archivo.

Cuentas (siempre las hace este script, nunca la IA):
  costo  = precio_lista × (1 − bonificación) × (1 + IVA de la lista)
  precio = costo × (1 + margen del rubro), redondeado hacia arriba al múltiplo de --redondeo

Salidas en --salida
- base-nueva.csv: la base con los costos y precios nuevos (privada).
- catalogo.csv: solo las columnas públicas, para pegar en la hoja que se publica.
- cambios.html: el informe para que el negocio lo apruebe antes de publicar.
"""

import argparse
import csv
import html
import json
import math
import os
import re
import sys
import unicodedata
from datetime import date
from decimal import Decimal, InvalidOperation

COLUMNAS_BASE = ["codigo", "rubro", "nombre", "medida", "material", "unidad",
                 "proveedor", "codigo_proveedor", "costo", "precio"]
COLUMNAS_PUBLICAS = ["codigo", "rubro", "nombre", "medida", "material", "unidad", "precio", "foto"]


def sin_acentos(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def clave_columna(nombre):
    n = sin_acentos(str(nombre or "")).strip().lower()
    return re.sub(r"[^a-z0-9]+", "_", n).strip("_")


def clave_codigo(codigo):
    return re.sub(r"[\s.\-/]", "", str(codigo or "")).upper()


def numero(valor):
    """Convierte '18.462,50', '18462.50', '$ 1.234' o 1234 en Decimal. Devuelve None si no hay número."""
    if valor is None:
        return None
    if isinstance(valor, (int, float)):
        return Decimal(str(valor))
    s = str(valor).strip().replace("$", "").replace("ARS", "").replace(" ", "").replace(" ", "")
    if not s or s in {"-", "--"}:
        return None
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        # En las listas argentinas la coma es el decimal: 18462,50
        s = s.replace(",", ".")
    elif "." in s:
        # Un punto seguido de tres cifras es separador de miles: 1.234 = 1234
        partes = s.split(".")
        if len(partes) > 2 or (len(partes) == 2 and len(partes[1]) == 3):
            s = s.replace(".", "")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def leer_tabla(ruta):
    """Devuelve una lista de diccionarios con las claves normalizadas."""
    if ruta.lower().endswith((".xlsx", ".xlsm")):
        try:
            import openpyxl
        except ImportError:
            sys.exit("Para leer .xlsx hace falta openpyxl (pip install openpyxl), o exportá la lista a CSV.")
        hoja = openpyxl.load_workbook(ruta, data_only=True, read_only=True).worksheets[0]
        filas = [list(f) for f in hoja.iter_rows(values_only=True)]
        filas = [f for f in filas if any(v not in (None, "") for v in f)]
        if not filas:
            return []
        encabezado = [clave_columna(v) for v in filas[0]]
        return [{encabezado[i]: f[i] for i in range(min(len(encabezado), len(f))) if encabezado[i]} for f in filas[1:]]
    for codificacion in ("utf-8-sig", "latin-1"):
        try:
            with open(ruta, newline="", encoding=codificacion) as fh:
                texto = fh.read()
            break
        except UnicodeDecodeError:
            continue
    try:
        dialecto = csv.Sniffer().sniff(texto[:4096], delimiters=";,\t")
    except csv.Error:
        dialecto = csv.excel
    lector = csv.reader(texto.splitlines(), dialecto)
    filas = [f for f in lector if any(c.strip() for c in f)]
    if not filas:
        return []
    encabezado = [clave_columna(c) for c in filas[0]]
    return [{encabezado[i]: f[i] for i in range(min(len(encabezado), len(f))) if encabezado[i]} for f in filas[1:]]


def redondear_arriba(valor, paso):
    if paso <= 0:
        return Decimal(math.ceil(valor))
    return Decimal(math.ceil(valor / paso) * paso)


def pesos(valor):
    if valor is None:
        return "—"
    entero = int(Decimal(valor).quantize(Decimal("1")))
    return "$ " + f"{entero:,}".replace(",", ".")


def porcentaje(valor):
    if valor is None:
        return "—"
    signo = "+" if valor > 0 else ("−" if valor < 0 else "")
    return f"{signo}{abs(valor):.1f}".replace(".", ",") + " %"


def leer_reglas_csv(ruta):
    """La hoja «Reglas» de la planilla, bajada como CSV: tipo, clave, valor.
    Tipos: margen (sin clave), margen_rubro (clave = rubro), bonificacion e iva_lista (clave = proveedor,
    o vacía para todos), redondeo y alerta (sin clave)."""
    reglas = {"margen_por_rubro": {}, "bonificacion_por_proveedor": {}, "iva_por_proveedor": {}}
    for fila in leer_tabla(ruta):
        tipo = clave_columna(fila.get("tipo"))
        clave = str(fila.get("clave") or "").strip()
        valor = numero(fila.get("valor"))
        if not tipo or valor is None:
            continue
        valor = int(valor) if valor == valor.to_integral_value() else float(valor)
        if tipo == "margen_rubro" and clave:
            reglas["margen_por_rubro"][clave] = valor
        elif tipo in ("bonificacion", "iva_lista") and clave:
            reglas["bonificacion_por_proveedor" if tipo == "bonificacion" else "iva_por_proveedor"][clave] = valor
        elif tipo in ("margen", "bonificacion", "iva_lista", "redondeo", "alerta"):
            reglas[tipo] = valor
    return reglas


def cargar_reglas(args):
    reglas = {"margen": 45, "margen_por_rubro": {}, "redondeo": 50, "bonificacion": 0, "iva_lista": 0, "alerta": 15}
    if args.reglas:
        if args.reglas.lower().endswith((".csv", ".xlsx")):
            reglas.update(leer_reglas_csv(args.reglas))
        else:
            with open(args.reglas, encoding="utf-8") as fh:
                reglas.update(json.load(fh))
    # Bonificación e IVA propios del proveedor de esta lista, si la planilla los tiene
    prov = clave_columna(args.proveedor)
    for clave, destino in (("bonificacion_por_proveedor", "bonificacion"), ("iva_por_proveedor", "iva_lista")):
        for nombre, valor in (reglas.get(clave) or {}).items():
            if clave_columna(nombre) == prov:
                reglas[destino] = valor
    for clave in ("margen", "redondeo", "bonificacion", "iva_lista", "alerta"):
        valor = getattr(args, clave)
        if valor is not None:
            reglas[clave] = valor
    reglas["margen_por_rubro"] = {clave_columna(k): v for k, v in reglas.get("margen_por_rubro", {}).items()}
    return reglas


def calcular(args):
    reglas = cargar_reglas(args)
    base = leer_tabla(args.base)
    faltan = [c for c in COLUMNAS_BASE if base and c not in base[0]]
    if faltan:
        sys.exit("A la base le faltan columnas: " + ", ".join(faltan))
    lista = leer_tabla(args.lista)
    for col in ("codigo_proveedor", "precio_lista"):
        if lista and col not in lista[0]:
            sys.exit(f"A la lista le falta la columna «{col}». Pasala al formato de SKILL.md (codigo_proveedor, descripcion, precio_lista).")

    proveedor = clave_columna(args.proveedor)
    por_codigo = {}
    repetidos = []
    for fila in lista:
        cod = clave_codigo(fila.get("codigo_proveedor"))
        precio = numero(fila.get("precio_lista"))
        if not cod or precio is None:
            continue
        if cod in por_codigo:
            repetidos.append(cod)
        por_codigo[cod] = {"codigo": str(fila.get("codigo_proveedor")).strip(),
                           "descripcion": str(fila.get("descripcion") or "").strip(), "precio_lista": precio}

    bonif = Decimal(str(reglas["bonificacion"])) / 100
    iva = Decimal(str(reglas["iva_lista"])) / 100
    paso = Decimal(str(reglas["redondeo"]))
    alerta = float(reglas["alerta"])

    cambios, faltantes, usados = [], [], set()
    for fila in base:
        if clave_columna(fila.get("proveedor")) != proveedor:
            continue
        cod = clave_codigo(fila.get("codigo_proveedor"))
        anterior = numero(fila.get("precio"))
        if cod not in por_codigo:
            faltantes.append({"codigo": fila["codigo"], "nombre": fila["nombre"], "medida": fila.get("medida", ""),
                              "codigo_proveedor": fila.get("codigo_proveedor", ""), "precio": anterior})
            continue
        usados.add(cod)
        margen = Decimal(str(reglas["margen_por_rubro"].get(clave_columna(fila.get("rubro")), reglas["margen"]))) / 100
        costo = por_codigo[cod]["precio_lista"] * (1 - bonif) * (1 + iva)
        nuevo = redondear_arriba(costo * (1 + margen), paso)
        variacion = None if not anterior else float((nuevo - anterior) / anterior * 100)
        fila["costo"] = str(costo.quantize(Decimal("0.01")))
        fila["precio"] = str(nuevo)
        cambios.append({"codigo": fila["codigo"], "nombre": fila["nombre"], "medida": fila.get("medida", ""),
                        "rubro": fila.get("rubro", ""), "unidad": fila.get("unidad", ""),
                        "anterior": anterior, "nuevo": nuevo, "variacion": variacion,
                        "margen": float(margen * 100), "alerta": variacion is not None and abs(variacion) >= alerta})
    nuevos = [v for k, v in por_codigo.items() if k not in usados and
              not any(clave_codigo(f.get("codigo_proveedor")) == k for f in base)]
    return reglas, base, cambios, faltantes, nuevos, repetidos


def escribir_csv(ruta, filas, columnas):
    with open(ruta, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=columnas, extrasaction="ignore")
        w.writeheader()
        for f in filas:
            w.writerow({c: f.get(c, "") for c in columnas})


def informe_html(args, reglas, cambios, faltantes, nuevos, repetidos):
    e = html.escape
    negocio = args.negocio or "el negocio"
    hoy = date.today().strftime("%d/%m/%Y")
    fecha_lista = args.fecha_lista or "sin fecha"
    suben = [c for c in cambios if c["variacion"] is not None and c["variacion"] > 0.05]
    bajan = [c for c in cambios if c["variacion"] is not None and c["variacion"] < -0.05]
    iguales = [c for c in cambios if c not in suben and c not in bajan]
    revisar = sorted([c for c in cambios if c["alerta"]], key=lambda c: -abs(c["variacion"]))
    total_ant = sum((c["anterior"] or 0) for c in cambios)
    total_nue = sum(c["nuevo"] for c in cambios if c["anterior"])
    promedio = float((total_nue - total_ant) / total_ant * 100) if total_ant else None
    margenes = sorted({round(c["margen"]) for c in cambios})

    def fila(c):
        v = c["variacion"]
        clase = "sube" if v is not None and v > 0.05 else ("baja" if v is not None and v < -0.05 else "igual")
        marca = ' <span class="ojo">revisar</span>' if c["alerta"] else ""
        return (f'<tr class="{clase}"><td class="cod">{e(c["codigo"])}</td>'
                f'<td>{e(c["nombre"])} <span class="med">{e(c["medida"])}</span><span class="uni">{e(c["unidad"])}</span>{marca}</td>'
                f'<td class="num">{pesos(c["anterior"])}</td><td class="num">{pesos(c["nuevo"])}</td>'
                f'<td class="num var">{porcentaje(v)}</td></tr>')

    ordenados = sorted(cambios, key=lambda c: -(c["variacion"] or 0))
    filas_revisar = "".join(fila(c) for c in revisar) or '<tr><td colspan="5">Ningún precio cambió más de lo normal.</td></tr>'
    filas_todas = "".join(fila(c) for c in ordenados)
    filas_faltan = "".join(
        f'<li><b>{e(f["codigo"])}</b> {e(f["nombre"])} {e(f["medida"])} (código del proveedor {e(f["codigo_proveedor"])}). '
        f'Queda a {pesos(f["precio"])} hasta que nos digan qué hacer.</li>' for f in faltantes)
    filas_nuevos = "".join(
        f'<li><b>{e(n["codigo"])}</b> {e(n["descripcion"])}: lista {pesos(n["precio_lista"])}.</li>' for n in nuevos)
    aviso_repetidos = (f'<p class="nota">Ojo: en la lista hay códigos repetidos ({e(", ".join(sorted(set(repetidos))))}); '
                       f'se usó el último precio de cada uno.</p>') if repetidos else ""

    muestra_head = '<meta name="robots" content="noindex">\n' if args.muestra else ""
    og = ""
    if args.og_image:
        og = (f'<meta property="og:title" content="Cambios de precios · {e(negocio)}">\n'
              f'<meta property="og:description" content="Lista de {e(args.proveedor)} del {e(fecha_lista)}: qué sube, qué baja y qué hay que revisar.">\n'
              f'<meta property="og:image" content="{e(args.og_image)}">\n<meta name="twitter:card" content="summary_large_image">\n')
    cinta = ('<div class="cinta" role="note">Informe de muestra · el negocio, el proveedor y los precios son inventados</div>'
             if args.muestra else "")

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cambios de precios · {e(negocio)} · lista de {e(args.proveedor)}</title>
<meta name="description" content="Informe de cambios de precios de {e(negocio)} con la lista de {e(args.proveedor)}: qué sube, qué baja y qué hay que revisar antes de publicar.">
{muestra_head}{og}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Red+Hat+Mono:wght@400;600&family=Work+Sans:wght@400;500;700&display=swap">
<style>
  /* Informe del taller: planilla de cambios, en tinta sobre papel, con el rojo y el azul de la lapicera del corrector. */
  :root{{--papel:#fbfaf7;--tinta:#1d2329;--gris:#5b6670;--linea:#dfe3e6;--sube:#9a3412;--baja:#1d4ed8;--marca:#fde68a;
    --f-texto:"Work Sans",system-ui,sans-serif;--f-num:"Red Hat Mono",ui-monospace,monospace}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--papel);color:var(--tinta);font:16px/1.5 var(--f-texto)}}
  .w{{max-width:980px;margin:0 auto;padding:28px max(16px,env(safe-area-inset-left)) 60px max(16px,env(safe-area-inset-right))}}
  .cinta{{background:var(--tinta);color:#fff;font:600 12px/1.3 var(--f-num);letter-spacing:.06em;text-transform:uppercase;padding:8px 16px}}
  h1{{font-size:clamp(1.6rem,1.2rem + 1.6vw,2.3rem);line-height:1.1;margin:0 0 6px;text-wrap:balance}}
  h2{{font-size:1.2rem;margin:34px 0 10px}}
  .sub{{color:var(--gris);margin:0}}
  .param{{display:flex;flex-wrap:wrap;gap:6px 18px;margin:16px 0 0;padding:12px 0;border-block:1px solid var(--linea);font:14px/1.4 var(--f-num);color:var(--gris)}}
  .param b{{color:var(--tinta);font-weight:600}}
  .resumen{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:20px}}
  .resumen div{{border-top:3px solid var(--tinta);padding-top:8px}}
  .resumen b{{display:block;font:600 1.8rem/1.1 var(--f-num)}}
  .resumen .s b{{color:var(--sube)}} .resumen .b b{{color:var(--baja)}}
  .tabla{{overflow-x:auto;margin-top:8px}}
  table{{width:100%;border-collapse:collapse;font-size:15px;min-width:560px}}
  th{{text-align:left;font:600 12px/1.3 var(--f-num);text-transform:uppercase;letter-spacing:.05em;color:var(--gris);border-bottom:2px solid var(--tinta);padding:8px 6px}}
  td{{padding:8px 6px;border-bottom:1px solid var(--linea);vertical-align:top}}
  .num{{text-align:right;font-family:var(--f-num);white-space:nowrap;font-variant-numeric:tabular-nums}}
  th.num{{text-align:right}}
  .cod{{font-family:var(--f-num);font-size:13px;color:var(--gris);white-space:nowrap}}
  .med{{font-family:var(--f-num);font-size:13px}}
  .uni{{display:block;font-size:13px;color:var(--gris)}}
  .sube .var{{color:var(--sube)}} .baja .var{{color:var(--baja)}}
  .ojo{{background:var(--marca);font:600 11px/1 var(--f-num);text-transform:uppercase;padding:3px 5px;border-radius:2px;margin-left:6px;white-space:nowrap}}
  ul{{padding-left:1.1em}} li{{margin:4px 0}}
  .nota{{color:var(--gris);font-size:15px}}
  .aprobar{{margin-top:34px;padding:16px;border:2px solid var(--tinta);border-radius:4px}}
  .aprobar p{{margin:0}}
</style>
</head>
<body>
{cinta}
<main class="w">
  <h1>Cambios de precios de {e(negocio)}</h1>
  <p class="sub">Lista de {e(args.proveedor)} del {e(fecha_lista)} · informe armado el {hoy}</p>
  <p class="param"><span>Bonificación de la lista: <b>{reglas['bonificacion']} %</b></span><span>IVA sumado: <b>{reglas['iva_lista']} %</b></span><span>Margen: <b>{" / ".join(f"{m} %" for m in margenes) or "—"}</b></span><span>Redondeo: <b>para arriba, de a ${reglas['redondeo']}</b></span></p>
  <div class="resumen">
    <div class="s"><b>{len(suben)}</b>suben</div>
    <div class="b"><b>{len(bajan)}</b>bajan</div>
    <div><b>{len(iguales)}</b>sin cambio</div>
    <div><b>{porcentaje(promedio)}</b>en promedio</div>
    <div><b>{len(faltantes)}</b>no vinieron</div>
    <div><b>{len(nuevos)}</b>nuevos en la lista</div>
  </div>

  <h2>Para revisar antes de publicar</h2>
  <p class="nota">Precios que cambian {reglas['alerta']} % o más: puede ser un aumento real o un error de la lista.</p>
  <div class="tabla"><table><thead><tr><th>Código</th><th>Producto</th><th class="num">Antes</th><th class="num">Ahora</th><th class="num">Cambio</th></tr></thead><tbody>{filas_revisar}</tbody></table></div>
  {"<h3>No vinieron en la lista</h3><ul>" + filas_faltan + "</ul>" if faltantes else ""}
  {"<h3>Productos nuevos del proveedor</h3><p class='nota'>No están en el catálogo. ¿Los sumamos?</p><ul>" + filas_nuevos + "</ul>" if nuevos else ""}
  {aviso_repetidos}

  <h2>Todos los cambios</h2>
  <div class="tabla"><table><thead><tr><th>Código</th><th>Producto</th><th class="num">Antes</th><th class="num">Ahora</th><th class="num">Cambio</th></tr></thead><tbody>{filas_todas}</tbody></table></div>

  <div class="aprobar"><p><b>Para publicar:</b> respondé «OK» por WhatsApp, o decinos qué precio querés cambiar. Hasta que lo apruebes, la web sigue con los precios de antes.</p></div>
</main>
</body>
</html>
"""


def main():
    p = argparse.ArgumentParser(description="Actualiza los precios del catálogo con la lista de un proveedor.")
    p.add_argument("--base", required=True, help="CSV privado con costos y precios actuales")
    p.add_argument("--lista", required=True, help="Lista del proveedor (.csv o .xlsx) con codigo_proveedor, descripcion, precio_lista")
    p.add_argument("--proveedor", required=True, help="Nombre del proveedor, igual que en la columna proveedor de la base")
    p.add_argument("--salida", required=True, help="Carpeta donde quedan base-nueva.csv, catalogo.csv y cambios.html")
    p.add_argument("--reglas", help="JSON con margen, margen_por_rubro, redondeo, bonificacion, iva_lista y alerta")
    p.add_argument("--bonificacion", type=float, help="Descuento del proveedor sobre la lista, en %%")
    p.add_argument("--iva-lista", dest="iva_lista", type=float, help="IVA a sumar si la lista viene «+ IVA», en %%")
    p.add_argument("--margen", type=float, help="Margen por defecto, en %%")
    p.add_argument("--redondeo", type=float, help="Redondeo hacia arriba, en pesos")
    p.add_argument("--alerta", type=float, help="Variación que se marca para revisar, en %%")
    p.add_argument("--negocio", help="Nombre del negocio para el informe")
    p.add_argument("--fecha-lista", dest="fecha_lista", help="Fecha de la lista del proveedor")
    p.add_argument("--muestra", action="store_true", help="Marca el informe como muestra (noindex y aviso)")
    p.add_argument("--og-image", dest="og_image", help="URL absoluta de la imagen para compartir")
    args = p.parse_args()

    reglas, base, cambios, faltantes, nuevos, repetidos = calcular(args)
    if not cambios and not faltantes:
        sys.exit(f"No hay productos de «{args.proveedor}» en la base. Revisá la columna proveedor.")
    os.makedirs(args.salida, exist_ok=True)
    columnas = list(base[0].keys()) if base else COLUMNAS_BASE
    escribir_csv(os.path.join(args.salida, "base-nueva.csv"), base, columnas)
    publicas = [c for c in COLUMNAS_PUBLICAS if c in columnas]
    escribir_csv(os.path.join(args.salida, "catalogo.csv"), base, publicas)
    with open(os.path.join(args.salida, "cambios.html"), "w", encoding="utf-8") as fh:
        fh.write(informe_html(args, reglas, cambios, faltantes, nuevos, repetidos))

    suben = sum(1 for c in cambios if (c["variacion"] or 0) > 0.05)
    bajan = sum(1 for c in cambios if (c["variacion"] or 0) < -0.05)
    print(f"{len(cambios)} productos de {args.proveedor}: {suben} suben, {bajan} bajan, "
          f"{len(cambios) - suben - bajan} sin cambio.")
    print(f"Para revisar (cambian {reglas['alerta']} % o más): {sum(1 for c in cambios if c['alerta'])}. "
          f"No vinieron: {len(faltantes)}. Nuevos en la lista: {len(nuevos)}.")
    print("Archivos: " + ", ".join(os.path.join(args.salida, n) for n in ("base-nueva.csv", "catalogo.csv", "cambios.html")))


if __name__ == "__main__":
    main()
