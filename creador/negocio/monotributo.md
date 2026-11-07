# Monotributo: cuándo y cómo darse de alta

Para hacer factura hace falta estar en el Monotributo. Muchos comercios la piden, sobre todo los que tienen local o contador. Esta guía junta lo que hace falta para darse de alta el día que entre el primer cliente que la pida, sin perder una tarde buscando.

> Datos de noviembre de 2026. ARCA actualiza los montos en febrero y agosto: confirmalos en [arca.gob.ar/monotributo](https://www.arca.gob.ar/monotributo/categorias.asp) antes de pagar. Ante cualquier duda con la actividad o la categoría, una consulta con un contador sale barata comparada con un error.

## Cuánto cuesta (servicios, desde el 1 de agosto de 2026)

| Categoría | Facturación máxima por año | Cuota nacional por mes |
|---|---|---|
| A | $12.009.410 | $49.527 |
| B | $17.595.183 | $56.379 |
| C | $24.670.494 | $66.020 |

A la cuota nacional se le suma Ingresos Brutos simplificado, que en Provincia de Buenos Aires y en CABA ya se paga junto con el monotributo (monotributo unificado):

- **Provincia de Buenos Aires (ARBA)**: categoría A, $11.505 por mes en servicios desde agosto de 2026.
- **CABA (AGIP)**: categoría A, $22.485 por mes desde enero de 2026; AGIP los readecuó en agosto, así que mirá el valor nuevo al darte de alta.

En Provincia, la categoría A queda en unos $61.000 por mes: **el primer abono de Presencia (USD 40) paga el monotributo**.

## Qué categoría te toca

Al empezar, elegís la categoría según lo que calculás facturar en un año. Después, en enero y julio, te recategorizás con lo que facturaste de verdad.

Con el dólar de referencia de `precios.md` ($1.560), la categoría A llega hasta unos USD 7.700 por año, o USD 640 por mes. Por ejemplo:

| Ritmo | Por mes | Por año | Categoría |
|---|---|---|---|
| 1 web Completa y 5 abonos de Presencia | USD 550 | ≈ $10,3 millones | A |
| 2 webs Completas y 5 abonos | USD 900 | ≈ $16,8 millones | B |
| 2 webs, 8 abonos y un taller cerrado cada dos meses | USD 1.170 | ≈ $21,9 millones | C |

Si también das clases particulares, esa plata suma a la misma facturación.

## Pasos

1. **Clave fiscal nivel 3.** La guía oficial explica cómo sacarla: [Cómo me adhiero al Monotributo](https://www.arca.gob.ar/guias/paso-a-paso/Guia-como-me-adhiero-monotributo.pdf).
2. **Alta en el Monotributo** desde arca.gob.ar/monotributo. Te pide:
   - **Actividad**: `620901`, «Servicios de desarrollo, diseño y/o mantenimiento de plataformas de gestión electrónica, portales digitales y/o aplicaciones móviles». Incluye mantener y actualizar sitios web. La sumó ARCA con la Resolución General 5607/2024. Si además das clases, cargá también esa actividad, y marcá como principal la que más facture.
   - **Domicilio**.
   - **Obra social**.
   - **Categoría**.

   En Provincia y CABA, el alta ya incluye Ingresos Brutos simplificado: [guía del monotributo unificado](https://arca.gob.ar/guias/paso-a-paso/guia-alta-monotributo-unificado.pdf).
3. **Punto de venta para facturar.** Se crea en «Administración de puntos de venta y domicilios», como factura electrónica de monotributo. Las facturas se hacen en «Comprobantes en línea» y son **Factura C**.
4. **Pagar la cuota** antes del 20 de cada mes, con débito automático o VEP.
5. **Anotar cada cobro.** El cierre de mes (`cierre.js`) ya junta los abonos. Sumale las webs y los talleres para saber cuánto llevás facturado antes de cada recategorización.

## Qué cambia en las cuentas del negocio

- Los precios de `precios.md` no incluyen impuestos: en el Monotributo no se suma IVA, la Factura C va por el total.
- En los presupuestos, la condición «Para hacer factura, hace falta estar en el Monotributo» se saca el día del alta.
- Si un mes se pasa del tope de la categoría, no pasa nada en el momento: se ajusta en la recategorización siguiente. Pasarse del tope de la última categoría saca del régimen, pero eso está muy lejos de nuestros números.

## Fuentes

- [Montos y categorías vigentes, ARCA](https://www.arca.gob.ar/monotributo/categorias.asp)
- [Así quedan las escalas, topes e importes a pagar desde agosto de 2026, iProfesional](https://www.iprofesional.com/impuestos/461293-monotributo-asi-quedan-las-escalas-topes-e-importes-a-pagar-desde-agosto-2026)
- [ARCA publicó la nueva tabla del monotributo desde agosto de 2026, Perfil](https://www.perfil.com/noticias/economia/arca-publico-nueva-tabla-monotributo-cuales-escalas-topes-cuotas-desde-agosto-2026-a40.phtml)
- [Monotributo unificado Buenos Aires: los nuevos importes de ARBA, iProfesional](https://www.iprofesional.com/impuestos/461356-monotributo-unificado-buenos-aires-cuanto-pagas-con-los-nuevos-importes-de-arba)
- [Monotributo unificado 2026 en CABA, El Cronista](https://www.cronista.com/economia-politica/monotributo-unificado-2026-asi-quedaron-las-categorias-y-el-valor-de-las-cuotas-a-partir-del-1-de-enero)
- [Resolución General 5607/2024 (actividad 620901), Boletín Oficial](https://www.boletinoficial.gob.ar/detalleAviso/primera/317523/20241129)
