---
name: redes-y-campanas
description: Arma el mes de redes de un comercio en un día (piezas con su identidad, textos y calendario para aprobar) y las campañas por WhatsApp a los clientes que ya tiene, con permiso y resultados medidos. Usar con "armá las redes de diciembre de…", "un mes de publicaciones para…", "campaña de fiestas para…", "mandales una promo a los clientes de…", "¿cómo le fue a la campaña de…?".
---

# Redes y campañas

Dos servicios para los comercios que ya son clientes: se venden juntos con la web o con Presencia, y usan la misma identidad.

## Redes del mes («un mes en un día», idea MKT-03)

1. **Material del cliente, una vez por mes**: fotos propias (del local, los productos, el equipo), promos y fechas del mes, y qué se vende más. **Nada de fotos de banco ni imágenes inventadas con IA del local**: si no hay foto, la pieza va tipográfica.
2. **Claude escribe el mes**: 12 publicaciones y 8 historias con datos reales (horarios, feriados, promos, preguntas que les hacen). Fechas argentinas: Día del Padre y de la Madre, Hot Sale, aguinaldo, vacaciones, feriados. Tono del local, en castellano rioplatense, sin frases genéricas («calidad y compromiso», «los mejores precios»): el detector de `revisar.js` aplica también acá.
3. **Piezas, textos y calendario**:

```bash
node .claude/skills/redes-y-campanas/scripts/redes.js <carpeta-privada>/redes.json --salida <carpeta-privada>/redes-<mes>
```

   Mirá el formato en `ejemplo/redes.json`. Deja las piezas (1080×1080 y 1080×1920) con sus colores y letras, `textos.txt` y `calendario.pdf`.
4. **El cliente aprueba el calendario** (una ronda de cambios) y se programa todo en Meta Business Suite en una sola sentada.
5. **Fin de mes**: alcance, mensajes recibidos y qué publicación anduvo mejor van al informe de Presencia.

## Campañas a sus clientes (idea MKT-05)

1. **La base**: el cliente exporta sus contactos (de WhatsApp Business, del sistema de ventas o de una planilla). **Solo entran los que aceptaron recibir mensajes** (Ley 25.326): columna `acepta` con «si». Si no hay permiso registrado, la primera campaña es para pedirlo en el mostrador y en la web.
2. **Segmentos simples**: frecuentes, nuevos, los que no vienen hace meses. Un mensaje por segmento, corto, con una sola oferta real y cómo responder.
3. **La cola de envío**:

```bash
node .claude/skills/redes-y-campanas/scripts/campana.js <carpeta-privada>/clientes.csv <carpeta-privada>/campana.json --salida <carpeta-privada>/campana-<nombre>
```

   `envio.html` es una página para el celular del comercio: un toque por cliente abre WhatsApp con su mensaje y la página recuerda a quién ya se le mandó. Como máximo 40 por día (`por_dia`), para que WhatsApp no bloquee el número. `difusion.txt` explica la alternativa con listas de difusión.
4. **Resultados**: el comercio anota en `resultados.csv` quién respondió, quién compró y por cuánto, y quién pidió no recibir más (se saca de la próxima).

```bash
node .claude/skills/redes-y-campanas/scripts/campana.js --informe <carpeta>/resultados.csv --negocio "<negocio>" --campana "<nombre>" --salida <carpeta>
```

Los datos de los clientes del comercio **nunca** van a este repo: carpetas privadas o archivos que se entregan.

## Mensajes

**Ofrecer redes a un cliente de web**: "Hola <nombre>, ¿cómo va la web? Una idea para el mes que viene: les armo las 12 publicaciones y 8 historias del mes en un día, con los colores de la web y sus fotos, y ustedes solo aprueban el calendario. Les paso un ejemplo: <calendario.pdf>. ¿Lo probamos un mes?"

**Ofrecer la campaña de fiestas**: "Hola <nombre>, ¿cuántos clientes tienen agendados en el WhatsApp? Para las fiestas les propongo una campaña: ordeno la lista, escribimos un mensaje con una oferta real y les dejo una página para mandarlo con un toque por cliente. Después les paso cuántos respondieron y cuánto vendieron. ¿Les interesa?"

## Precios

En `creador/negocio/precios.md` (sección «Redes y campañas»).
