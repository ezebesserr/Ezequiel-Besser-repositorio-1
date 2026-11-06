---
name: catalogo-vivo
description: Arma el catálogo de un comercio que se carga desde una planilla de Google y le mantiene los precios al día con la lista nueva de cada proveedor (la IA pasa la lista a limpio, el script hace las cuentas y el cliente aprueba antes de publicar). Usar con "armá el catálogo de…", "llegó la lista de precios de…", "actualizá los precios de…", "pasá esta lista al catálogo".
---

# Catálogo vivo

Es la línea de negocio para comercios con muchos productos y precios que cambian: repuesteras, buloneras, ferreterías, librerías, corralones, mayoristas. Se vende en dos partes (precios en `creador/negocio/precios.md`):

- **Paquete Catálogo**: la web con buscador, filtros y pedido por WhatsApp, cargada desde una planilla de Google.
- **Precios al día** (abono mensual): cada vez que llega la lista de un proveedor, la pasamos a la planilla con su margen y le mandamos al cliente qué cambió para que lo apruebe.

Muestra para enseñar: `muestras/catalogo-vivo/` (Bulonera Tres Hilos, inventada) y su informe `muestras/catalogo-vivo/cambios.html`, que es la salida real del script.

## 1. Armar el catálogo (una vez)

1. **Diseño**: seguí la skill `crear-pagina` (identidad del local, tres direcciones, revisar.js). De la muestra se copia la estructura y el código, no la estética.
2. **Planilla**: que la cree el cliente en su cuenta de Google y nos comparta como editores, así queda a su nombre. Dos hojas:
   - **Base** (privada, no se publica nunca): `codigo, rubro, nombre, medida, material, unidad, proveedor, codigo_proveedor, costo, precio, foto`.
   - **Catálogo** (la que lee la web): en A1, `=QUERY(Base!A:K; "select A, B, C, D, E, F, J, K"; 1)`. Muestra todo menos proveedor, código de proveedor y costo. Con la planilla en español el separador es `;`.
3. **Publicar solo la hoja Catálogo**: Archivo → Compartir → Publicar en la web → elegir «Catálogo» → «Valores separados por comas (.csv)» → Publicar. Pegá esa URL en `CSV_URL` del `index.html`. Abrila en una ventana privada y confirmá que **no** aparecen costos.
4. **Respaldo**: dejá también los datos en `<script type="text/csv" id="datos">` del `index.html`. Si la planilla no responde, la web muestra esos. Se actualizan en cada mantenimiento.
5. Google tarda unos minutos en mostrar los cambios de la hoja publicada. Avisale al cliente.
6. Fotos (opcional): columna `foto` con `img/<codigo>.jpg`, de menos de 300 KB.

## 2. Precios al día (cada vez que llega una lista)

Todo lo del cliente (listas, `base.csv`, `reglas.json`, informes) va **fuera de este repo**, que es público. Usá la carpeta temporal de la sesión o una carpeta privada del cliente.

1. **Reglas del cliente** (una vez, por escrito): bonificación de cada proveedor, si la lista viene con IVA o «+ IVA», margen por rubro, redondeo y desde qué variación se revisa a mano. Van en `reglas.json`, como `.claude/skills/catalogo-vivo/ejemplo/reglas.json`.
2. **Pasar la lista a limpio** con tres columnas: `codigo_proveedor, descripcion, precio_lista`.
   - Excel o CSV: elegí las columnas. El script lee `.xlsx` directo y entiende encabezados con tildes.
   - PDF: leelo con Read (de a 20 páginas) y transcribí cada fila al CSV, **sin hacer cuentas**: el precio tal cual figura, sin bonificación ni IVA.
   - Foto o escaneo: igual que el PDF, pero revisá cada precio.
   - Control antes de seguir: la cantidad de filas tiene que coincidir con la lista y 10 filas al azar tienen que dar igual que el original.
3. **Base actual**: descargá la hoja Base como CSV (Archivo → Descargar → .csv).
4. **Correr el script**:

   ```bash
   python3 .claude/skills/catalogo-vivo/scripts/precios.py \
     --base base.csv --lista lista-limpia.csv --proveedor "<como figura en la columna proveedor>" \
     --reglas reglas.json --negocio "<negocio>" --fecha-lista "<fecha de la lista>" --salida <carpeta>
   ```

   Deja `base-nueva.csv` (privada), `catalogo.csv` (solo columnas públicas) y `cambios.html` (el informe). Las cuentas las hace siempre el script: `costo = lista × (1 − bonificación) × (1 + IVA)` y `precio = costo × (1 + margen)`, redondeado hacia arriba.
5. **Revisar el informe**: lo marcado «revisar» (cambia más que la alerta), lo que no vino en la lista y los productos nuevos. Si un salto grande es un error de transcripción, corregí el CSV y volvé a correr.
6. **Mandar el informe al cliente** como archivo o página privada, con el mensaje de abajo. Nunca publicar sin su «OK».
7. **Publicar**: con el OK, importá `base-nueva.csv` en la hoja Base (Archivo → Importar → Reemplazar la hoja actual). La hoja Catálogo se actualiza sola y la web también.

Para probar el circuito completo sin datos reales:

```bash
python3 .claude/skills/catalogo-vivo/scripts/precios.py --base .claude/skills/catalogo-vivo/ejemplo/base.csv \
  --lista .claude/skills/catalogo-vivo/ejemplo/lista-fijaciones-delta.csv --proveedor "Fijaciones Delta" \
  --reglas .claude/skills/catalogo-vivo/ejemplo/reglas.json --negocio "Bulonera Tres Hilos" --salida /tmp/prueba
```

## 3. Reglas que no se negocian

- Los precios salen solo de las listas y las reglas del cliente. La IA transcribe; no calcula ni redondea.
- Nada que cambie más que la alerta se publica sin aprobación explícita.
- Costos, bonificaciones y listas de proveedores nunca van a la hoja publicada ni a este repo.

## 4. Mensajes

**Primer contacto** (sumá la observación concreta de su web, como en `mensajes-y-precios`):

> Hola, ¿qué tal? Soy <nombre>, estudiante avanzado de Ingeniería, y hago páginas web para comercios de la zona.
>
> Vi que en su web <observación: la lista de precios es un PDF de <fecha> / no hay precios / el catálogo no se ve en el celular>.
>
> Les propongo armarles sin cargo una muestra con 30 de sus productos: buscador por medida o código y pedido por WhatsApp. Los precios se cargan desde una planilla, y cuando llega la lista del proveedor nosotros hacemos las cuentas con su margen; ustedes solo aprueban.
>
> Así funciona en una bulonera de ejemplo: <link a muestras/catalogo-vivo/>
>
> ¿Les interesa que se la arme?

**Informe de cambios**:

> Hola <nombre>, llegó la lista de <proveedor> del <fecha>. Suben <n> productos (<x %> en promedio) y bajan <n>. Para mirar: <los marcados «revisar»>. No vinieron: <n>. Te paso el informe completo: <link o archivo>. Si está bien, respondé «OK» y lo publicamos hoy.
