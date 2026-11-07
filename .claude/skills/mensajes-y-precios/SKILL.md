---
name: mensajes-y-precios
description: Escribe los mensajes para ofrecerle una página web a un negocio (WhatsApp, mail, guion de llamada, seguimiento) y arma el presupuesto en pesos con los precios del taller. Usar con "preparale el mensaje a…", "escribile a…", "cuánto le cobro a…", "armá el presupuesto para…".
---

# Mensajes y presupuestos

Quién firma y qué trabajos mostrar: `creador/negocio/perfil.md`. Precios y condiciones: `creador/negocio/precios.md`.

## Reglas para todos los mensajes

- Presentación: "Soy <nombre>, estudiante avanzado de Ingeniería, y hago páginas web para comercios de la zona" (o la que diga el perfil). Si firman dos personas, todo en plural.
- Una observación **concreta y verificable** de su web: que sale en blanco porque era Flash, el copyright viejo, que en el celular se ve en miniatura, el aviso de "No seguro". Nunca insultes la web ni exageres.
- Ofrecé una **muestra gratis** de la página nueva, con dos o tres cosas propias del rubro (la carta, los turnos, las propiedades con fotos…).
- Link a un trabajo propio del perfil, primero la muestra del rubro más parecido.
- Cerrá con una pregunta fácil: "¿Les interesa que se la arme?".
- Al negocio se lo trata de "ustedes". Español rioplatense.
- En los mails, última línea: "Si prefieren no recibir más mensajes, respondan «no» y no les vuelvo a escribir."

## Plantillas

**WhatsApp (primer contacto)**

> Hola, ¿qué tal? Soy <nombre>, estudiante avanzado de Ingeniería, y hago páginas web para comercios de la zona.
>
> Entré a la web de <negocio> y vi que <observación concreta>.
>
> Les propongo armarles sin cargo una muestra de cómo quedaría la página nueva: que se vea bien en el celular, con <dos o tres cosas del rubro>. Si les gusta, lo charlamos; si no, no pasa nada.
>
> Acá pueden ver un trabajo mío: <link>
>
> ¿Les interesa que se la arme?

**Mail**: asunto específico ("La web de <negocio> se ve en blanco" si no carga; si no, "Una propuesta para la web de <negocio>"), el mismo contenido en tres o cuatro párrafos, firma con nombre, presentación y WhatsApp, y la línea para darse de baja.

**Llamada**: "Hola, buen día. ¿Hablo con <negocio>? Me llamo <nombre>, soy estudiante avanzado de Ingeniería y hago páginas web para comercios de la zona. Los llamo porque entré a su página y <observación>. ¿Con quién podría hablar sobre la página?". Con el dueño o encargado, ofrecer la muestra y pedir un WhatsApp o un mail para mandarla.

**Seguimiento** (una sola vez, 4 o 5 días después): "Hola, ¿cómo andan? Les escribí hace unos días por la página web de <negocio>. ¿Pudieron verlo? Si les sirve, les armo la muestra sin compromiso. Y si no les interesa, me avisan y no los molesto más. ¡Gracias!"

**Presupuesto** (cuando ya vieron la muestra): link a la muestra, paquete y qué incluye, precio en pesos, forma de pago (50% para arrancar y 50% al publicar), plazo, extras opcionales y mantenimiento. Si es de los tres primeros clientes, ofrecé el precio de lanzamiento.

## Presupuesto en un paso

```bash
node .claude/skills/mensajes-y-precios/scripts/presupuesto.js --cliente "<negocio>" --paquete completa \
  [--extra idioma] [--abono presencia] [--lanzamiento] [--muestra <link>] [--telefono "<su WhatsApp>"] \
  [--alias "<alias o CBU>"] [--dolar <cotización>] --salida <carpeta-privada>
```

- Lee los precios de `creador/negocio/precios.md` y la firma de `creador/negocio/perfil.md`: si cambia un precio, se cambia solo ahí.
- `--paquete` es lo de pago único (Esencial, Completa, Catálogo, Puesta a punto de Google, talleres, WhatsApp configurado); `--abono`, lo mensual (Mantenimiento, Presencia, Presencia + IA, Precios al día); `--extra`, los extras. Alcanza con parte del nombre.
- Sin `--dolar`, trae el dólar oficial del día de dolarapi.com; si no hay red, usa la referencia de `precios.md` y avisa.
- Deja `presupuesto.pdf` (para mandar), `presupuesto.html` y `mensaje.txt`, y si le pasás `--telefono`, el link de WhatsApp con el mensaje ya escrito. La carpeta de salida va fuera del repo: los montos acordados son privados.
- Lo que falta (tu WhatsApp, tu mail, el alias) sale resaltado en amarillo en el PDF y el script lo avisa.

A mano, si hiciera falta: dólares de `precios.md` × dólar oficial (venta), redondeado a miles, «precio válido por 15 días».

## El WhatsApp Business del taller

```bash
node .claude/skills/mensajes-y-precios/scripts/catalogo-propio.js <carpeta> [--dolar <cotización>]
```

Deja una tarjeta de 1080 × 1080 por servicio para el catálogo de WhatsApp Business (web de una pantalla, completa, catálogo, puesta a punto de Google, Presencia, WhatsApp configurado y taller), `catalogo.txt` con el nombre, el precio en pesos y la descripción de cada uno, y `perfil.txt` con la descripción del perfil, la bienvenida, la ausencia y las respuestas rápidas (`/muestra`, `/precios`, `/pasos`, `/pago`, `/plazos`, `/google`). Todo sale de `precios.md`: cuando cambia un precio o el dólar, se vuelve a correr y se reemplazan las tarjetas.

## El Mostrador

El seguimiento de cada contacto vive en el **Mostrador de ventas**, una página privada de Claude (buscala con la herramienta Artifact, `action: "list"`). Tiene el próximo paso de cada uno, el mensaje de su etapa con WhatsApp a un toque y los abonos del mes. Cuando armes mensajes para prospectos nuevos, cargalos ahí con ArtifactData (colección `contactos`; ver la skill `venta-completa`).

## Recordatorios para quien manda los mensajes

- De a 10 o 15 por día, a mano, desde WhatsApp Business.
- Registro Nacional No Llame (Ley 26.951): si el número está anotado, contactar por mail o en persona.
- Si piden factura, hace falta estar en el Monotributo.
