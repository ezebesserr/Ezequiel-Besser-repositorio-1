---
name: exportar
description: Lleva el taller afuera: webs para comercios de Uruguay, España o México con webs viejas (el mismo proceso, cobrando en dólares) y auditorías de visibilidad en IA para comercios hispanos de Estados Unidos o España. Usar con "buscá clientes en Montevideo", "prospectos en Madrid", "armá la auditoría de IA de…", "mensaje en inglés para…", "¿cuánto le cobro a un cliente de afuera?".
---

# Exportar el taller (ideas EXT-01 y EXT-05)

El mismo proceso de siempre (auditoría, muestra gratis, sitio, abono), para comercios de otros países, cobrando en dólares. Con IA, estudiar otro mercado y escribir en su castellano lleva horas, no semanas.

## 1. Webs para comercios de afuera (EXT-01)

1. **Prospectos**: el mismo circuito de `buscar-clientes`, con el extracto de la ciudad. BBBike tiene extractos de Montevideo, Madrid, Barcelona, Ciudad de México y otras: `https://download.bbbike.org/osm/bbbike/<Ciudad>/<Ciudad>.osm.pbf`. `geo.py` ya devuelve barrio y ciudad fuera de Argentina.
2. **Teléfonos**: siempre con código de país (`+598 99 123 456`). El Mostrador los acepta así y arma el link de WhatsApp.
3. **Mensajes en su castellano**:
   - Uruguay: voseo, como acá; «celular» y «web» se entienden igual.
   - España: tú o vosotros; «móvil», «página web», «presupuesto».
   - México: usted o tú, según el rubro; «celular», «página», «cotización».
   Nada de modismos porteños («laburo», «che»). La muestra gratis pesa el doble a distancia: siempre va con la muestra.
4. **Precios en dólares**: sección «Exportar el taller» de `creador/negocio/precios.md`. En euros, el mismo número.
5. **Antes del primer cobro**: ver con un contador cómo cobrar desde afuera y la factura de exportación de servicios en el Monotributo (Factura E). No prometer medios de pago que no tengamos andando.

**Primer mensaje (Uruguay)**: "Hola, ¿qué tal? Soy <nombre>, <presentación>, y hago páginas web para comercios. Entré a la web de <negocio> y vi que <observación>. Les armo sin costo una muestra de cómo quedaría, adaptada al celular y con WhatsApp a un toque. Trabajo a distancia: todo se hace por WhatsApp y videollamada. Si les gusta, lo charlamos; si no, no pasa nada."

## 2. Auditoría de visibilidad en IA (EXT-05)

Para comercios y profesionales hispanos de Estados Unidos o España: qué responden ChatGPT, Gemini y Google con IA cuando un cliente pregunta por su rubro en su barrio.

1. **La prueba** (la hace una persona, el mismo día):
   - Cinco preguntas como las haría un cliente, **sin el nombre del negocio**: rubro y barrio, el producto que los distingue, «abierto ahora», «con delivery». En Estados Unidos, mitad en inglés y mitad en castellano.
   - Sesión sin historial y sin haber iniciado sesión. Anotar si aparece (y en qué lugar) y a quién recomiendan en su lugar. Guardar capturas.
   - Revisar la ficha de Google (horarios, rubro, fotos, reseñas respondidas) y la web (celular, qué venden y dónde en texto, datos estructurados).
2. **El informe**:

```bash
node .claude/skills/exportar/scripts/visibilidad.js <carpeta-privada>/<negocio>.json --salida <carpeta-privada>/<negocio>
```

   Mirá `ejemplo/visibilidad.json` (datos inventados). Con `"idioma": "en"` sale en inglés. Deja `informe.pdf` y `informe.png`, con el resultado en grande, la tabla de preguntas, a quién recomiendan, ficha, web y las cinco acciones en orden.
3. **Venta**: las primeras cinco, gratis, a comercios con webs flojas, para tener casos. Después, la auditoría paga y el control mensual. **Nunca prometer que va a aparecer**: se vende mejorar las chances, con la medición de cada mes.

**First message (US)**: "Hi <name>, I'm <nombre>, a web developer working with Hispanic-owned businesses. I asked ChatGPT, Gemini and Google's AI for the best <rubro> in <barrio>, and <negocio> didn't come up in <n> of <total> answers; <competidor> did. I put together a free 2-page report with what they see and five fixes. Want me to send it?"

## Reglas

- Los datos de los prospectos de afuera tampoco van al repo: Mostrador o archivos privados.
- Los resultados de la prueba se anotan tal cual salieron: no se completan «a ojo».
