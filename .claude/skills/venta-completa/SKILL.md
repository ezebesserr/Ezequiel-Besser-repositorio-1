---
name: venta-completa
description: Lleva a cada negocio de punta a punta con la menor cantidad de pasos para quien vende. Claude lo carga en el Mostrador de ventas, prepara la observación y el mensaje, arma la muestra, el presupuesto en PDF, la entrega y el abono, y deja cada próximo paso con fecha. Usar con "vendele a <negocio>", "arrancá con <negocio>", "seguí con <negocio>", "cargá estos prospectos", "¿qué tengo para hoy?", "me dijeron que sí", "cobré la seña de <negocio>".
---

# Venta completa

La idea: quien vende hace solo tres cosas. **Toca «WhatsApp»** en el Mostrador y manda el mensaje que ya está escrito, **habla con el cliente** y **cobra**. Todo lo demás lo hace Claude con las skills del taller, y cada paso deja anotado el siguiente con su fecha.

## El Mostrador

Es una página privada de Claude llamada **Mostrador de ventas**. Buscala con la herramienta Artifact (`action: "list"`) y trabajá sus datos con ArtifactData sobre esa URL. Tiene:

- `config/general`: `firma`, `presentacion`, `dolar`, `fecha_dolar`, `link_trabajo`, `link_presencia`, `link_catalogo`, `link_taller`, `alias` y, opcional, `precios` (`{esencial, completa, catalogo, puesta, presencia}` en USD, copia de `creador/negocio/precios.md`; sin él, usa los de noviembre de 2026). Si cambia un precio en `precios.md`, actualizalo también acá.
- `contactos/<id>` (un documento por negocio; el id es el nombre en minúscula con guiones, por ejemplo `vidrieria-del-bajo`):

| Campo | Qué va |
|---|---|
| `negocio`, `rubro`, `zona` | Texto. |
| `etapa` | `prospecto`, `contactado`, `muestra`, `presupuesto`, `sena`, `produccion`, `publicado`, `abono` o `perdido`. |
| `linea` | `web`, `presencia`, `catalogo`, `taller`, `afuera` u `otro`: elige el mensaje del primer contacto. `afuera` es para comercios de otros países (skill `exportar`): mensaje propio y presupuesto y respuestas solo en dólares, sin el alias. |
| `telefono`, `email`, `web` | Como figuran en su web. El Mostrador arma el link `wa.me/549…`. |
| `observacion` | La observación concreta y verificable que va en el primer mensaje. |
| `muestra_url`, `detalle`, `presupuesto_usd`, `abono_usd` | Link de su muestra, qué se presupuestó, monto en USD y abono mensual en USD. |
| `proximo`, `fecha_proximo` | El próximo paso y su fecha (AAAA-MM-DD). Lo que tiene fecha de hoy o vencida aparece en «Hoy». |
| `notas`, `historial` | Notas libres; el historial es una lista de `{f: fecha, t: texto}` (sumá, no borres). |

- `config/metas`: los supuestos de la pestaña Metas (`mensajes` por semana, `responden`, `muestra`, `capacidad` de muestras por mes, `compran`, `ticket`, `abono_pct`, `abono_usd`, `bajas`, `talleres`, `asistentes`, `precio_taller`, `taller_compra`). Si quien vende pregunta «¿cómo voy?», compará la proyección con los números reales del embudo y proponé qué supuesto ajustar.

Reglas para escribir: un `set` por documento con **todos** los campos (leelo primero y pasá su `version` como `if_version`); para varios contactos, `batch`. Sumá una línea al `historial` en cada cambio de etapa. Los datos de clientes viven **solo** ahí o en archivos privados, nunca en este repo.

## Cuando el cliente contesta

En la ficha de cada contacto, «Si te contesta…» tiene las respuestas a lo que más dicen: «Ya tengo web» (o «Ya tengo la ficha» en Presencia), «¿Cuánto sale?», «Es caro», «Lo hace un conocido», «Mandame info», «No tengo tiempo», «Vendo por Instagram», «Lo pienso» y «No me interesa». Quien vende toca una y la respuesta queda en el cuadro del mensaje, con la observación de ese local y los precios en pesos del día, lista para WhatsApp. «Lo pienso» además anota el seguimiento a cuatro días. Si un cliente dice algo que no está, escribí la respuesta y, si se repite, sumala a `objeciones()` en el Mostrador.

## «¿Qué tengo para hoy?»

Leé `contactos` y mostrá los que tienen `fecha_proximo` de hoy o vencida (sin los `perdido`), ordenados por fecha, con su próximo paso. Si alguno necesita algo de Claude (una muestra, un presupuesto, un informe), hacelo en el momento y actualizá el contacto.

## Paso a paso

1. **Prospectos.** Salen de `buscar-clientes`, de una lista que pase quien vende o de un taller. Para cada uno, una observación concreta, la `linea` que conviene ofrecer y sus datos públicos de contacto: `auditoria.js --lote` (skill `buscar-clientes`) lo deja todo en `mostrador.json`, listo para un `batch`. Cargalos en el Mostrador como `prospecto` con fecha de hoy, en tandas de 10 a 15, que es lo que se manda por día. **Quien vende toca WhatsApp en cada uno y lo pasa a «Contactado»**: el Mostrador le pone el seguimiento a 4 días.
2. **Dijeron que sí.** Muestra con `crear-pagina` (o `catalogo-vivo`, o la puesta a punto de `presencia-mensual`), revisada con `revisar.js`, y publicada con `publicar`. Actualizá el contacto: `muestra_url`, etapa `muestra`, próximo paso a 3 días. El mensaje de la muestra ya queda escrito en el Mostrador.
3. **Presupuesto.** `node .claude/skills/mensajes-y-precios/scripts/presupuesto.js` con el paquete que corresponda y su teléfono. Mandale el PDF a quien vende (SendUserFile) y actualizá el contacto: `detalle`, `presupuesto_usd`, etapa `presupuesto`, seguimiento a 3 días.
4. **Seña cobrada.** Etapa `sena`. Sitio final con su material (`crear-pagina` y `publicar`), una ronda de cambios por vez. Antes de entregar, `entrega.js` (skill `publicar`) chequea el sitio y arma la hoja y el mensaje de entrega: mandale los dos a quien vende. Al publicar, etapa `publicado`: el Mostrador propone ofrecer Presencia al día siguiente.
5. **Abono.** Con el sí a Presencia o a Precios al día, `abono_usd` y etapa `abono` con fecha a fin de mes. Puesta a punto y tarjeta de reseñas (`presencia-mensual`), o planilla y precios (`catalogo-vivo`). Cada fin de mes, `cierre.js` arma todos los informes y los mensajes de cobro; después, la fecha de cada abono pasa al fin del mes siguiente.
6. **No.** Etapa `perdido` con el motivo en `notas`. Nunca más de un seguimiento sin respuesta.

## Lo que quien vende tiene que pasar una sola vez

En `creador/negocio/perfil.md`: WhatsApp y mail para clientes. En el Mostrador, Ajustes: alias o CBU para cobrar y el dólar del día (o que Claude lo actualice con el de `precios.md` o dolarapi.com). Mientras falten, los mensajes y el presupuesto los muestran marcados para completar.
