---
name: presencia-mensual
description: Pone a punto la ficha de Google de un comercio, arma el circuito de reseñas, prueba si lo recomiendan los asistentes con IA y le manda cada mes el informe de cuántos clientes llegaron desde Google. Usar con "poné a punto la ficha de…", "auditá la ficha de Google de…", "respondé las reseñas de…", "armá el informe del mes de…", "¿aparece <negocio> en ChatGPT?".
---

# Presencia mensual

La línea que convierte cada web en un ingreso todos los meses. Se vende en tres escalones (precios en `creador/negocio/precios.md`):

- **Puesta a punto de Google** (pago único): ficha completa, tarjeta de reseñas para el mostrador, respuesta a las últimas reseñas y datos del negocio ordenados en la web.
- **Presencia** (abono): mantenimiento de la web, ficha al día, respuesta a todas las reseñas e informe mensual.
- **Presencia + IA** (abono): lo anterior, más la prueba mensual con asistentes de IA y una mejora por mes para aparecer en sus respuestas.

Muestra para enseñar: `muestras/presencia/` (el informe de octubre de la Ferretería Rosca, inventada). Es también la plantilla de los informes reales.

## 1. Auditoría (gratis, es el gancho)

Con el nombre y el barrio del comercio, sin pedirle nada:

- **Ficha de Google**: nombre exacto (sin palabras agregadas), categoría principal y secundarias, dirección y pin en el mapa, horarios y horarios especiales, teléfono, web, fotos (cuántas, de cuándo, si hay del frente con el cartel), productos o servicios, descripción, reseñas (cuántas, promedio, cuántas respondidas).
- **Web**: que nombre, dirección, horario y teléfono digan lo mismo que la ficha; datos estructurados `LocalBusiness`; preguntas frecuentes reales (envíos, pagos, zonas).
- **Prueba con IA**: ver el punto 4.

Resultado: tres cosas concretas para arreglar, con captura. Se las mandamos con el mensaje de abajo. Si además tiene la web vieja, sumá la observación de `mensajes-y-precios`.

## 2. Acceso y puesta a punto

- El dueño nos suma como **administrador** desde su cuenta (Perfil de Negocio → Personas y acceso → Agregar). Nunca pedimos contraseñas. Si la ficha no existe o no está verificada, la crea y verifica él, con nuestra ayuda.
- Completar todo lo de la auditoría con datos reales del local. Nada de palabras clave agregadas al nombre: Google lo penaliza.
- Fotos: al menos 10 reales (frente con cartel, mostrador, productos, el oficio). Si no hay, se las pedimos o vamos a sacarlas.
- WhatsApp: si la ficha ofrece la opción de chat por WhatsApp, configurala; si no, que esté bien a mano en la web.
- Reseñas: con el link para pedir reseñas de la ficha (Perfil de Negocio → «Pedir reseñas»), armá la tarjeta del mostrador con su identidad (sin descuentos ni premios a cambio, que Google lo prohíbe) y un mensaje corto para mandar después de cada venta. Respondé las últimas 10 reseñas.

  ```bash
  node .claude/skills/presencia-mensual/scripts/tarjeta.js --negocio "<negocio>" --link "<link de reseñas>" \
    --marca "<color de su marca>" --acento "<segundo color>" --letra "<familia de Google Fonts>" --salida <carpeta>
  ```

  Deja `tarjeta.pdf` (cuatro de 10 × 14 cm por hoja A4, para imprimir y recortar) y `tarjeta.png` (para mandarla por WhatsApp o subirla a las redes). Colores y letra, los de `identidades-usadas.md`.
- Web: `LocalBusiness` en JSON-LD con los mismos datos que la ficha y una sección de preguntas frecuentes con lo que más les preguntan.

## 3. Rutina de cada mes (unas dos horas por cliente)

- **Reseñas**: revisarlas dos veces por semana y responder todas en menos de 48 horas. Agradecer con un detalle de lo que contó la persona, sin datos personales. Las negativas: reconocer, invitar a hablar por el WhatsApp del local y no discutir; **el dueño aprueba la respuesta antes de publicarla**.
- **Ficha**: dos publicaciones (novedad, producto, horario), fotos nuevas si llegaron y horarios especiales antes de cada feriado.
- **Cierre del mes**: del panel Rendimiento de la ficha, anotar las interacciones (llamadas, mensajes, cómo llegar, clics a la web), las búsquedas con las que los encontraron y las reseñas. Si el panel no muestra alguna, sacala del informe en vez de inventarla.
- **Prueba con IA** (solo en Presencia + IA): punto 4.
- **Informe**: copiá el bloque de datos de `muestras/presencia/index.html` a un `datos.json` privado del cliente, cambiá los números, lo que hicimos, lo que proponemos y lo que le pedimos, y corré:

  ```bash
  node .claude/skills/presencia-mensual/scripts/informe.js <carpeta-privada>/datos.json <carpeta-privada>/2026-10
  ```

  Deja `informe.html`, `informe.pdf` e `informe.jpg`. El script no deja guardar dentro del repo: los números de los clientes son privados. Mirá el PDF antes de mandarlo.

- **Todos los clientes de una vez**: con una carpeta privada que tenga una subcarpeta por cliente (cada una con su `datos.json`, al que se le suman `telefono`, `contacto`, `abono` y `abono_usd`):

  ```bash
  node .claude/skills/presencia-mensual/scripts/cierre.js <carpeta-clientes> <carpeta-salida> [--dolar <cotización>] [--alias "<alias o CBU>"]
  ```

  Arma todos los informes y deja `cierre.html`: por cliente, el mensaje del mes (cuántos contactos, la variación, lo que le pedimos y el abono en pesos) con el botón de WhatsApp ya escrito y la ruta del PDF para adjuntar. También `cierre.csv` con el total de abonos del mes. Después, en el Mostrador, pasá la fecha de cada cliente con abono al fin del mes siguiente.

## 4. Prueba con asistentes de IA

- Cinco preguntas fijas por cliente, como las haría un vecino y **sin el nombre del local**: rubro + barrio, el servicio que lo distingue, una zona de envío, «¿qué <rubro> me recomendás en <barrio>?».
- Hacerlas el último día del mes en ChatGPT, Gemini y el buscador de Google con IA, en una sesión sin historial. Anotar «aparece» o «no aparece» y guardar capturas en la carpeta privada.
- Lo que sube las chances, sin trucos: datos iguales en todos lados, ficha completa, reseñas reales y respondidas, una web que diga claro qué venden, dónde y en qué horario, y preguntas frecuentes con datos concretos.
- **Nunca prometer que va a aparecer.** Se vende como mejorar las chances, con la medición de cada mes.

## 5. Mensajes

**Auditoría a un comercio** (primer contacto):

> Hola, ¿qué tal? Soy <nombre>, estudiante avanzado de Ingeniería, y trabajo con comercios de la zona en su presencia en Google.
>
> Busqué «<rubro> en <barrio>» y vi que la ficha de <negocio> <observación concreta: no tiene horario del feriado / tiene 3 fotos de 2019 / tiene 12 reseñas sin responder>.
>
> Les puedo dejar la ficha completa y armarles una tarjeta con QR para el mostrador, así los clientes contentos dejan su reseña. Acá ven el informe que les mando cada mes a los comercios con los que trabajo: <link a muestras/presencia/>
>
> ¿Les interesa que lo veamos?

**A un cliente de web** (al entregar la web): «Ya está publicada. Para que la encuentren, el paso que sigue es la ficha de Google y las reseñas. Con el abono Presencia nos ocupamos todos los meses y te mando un informe como este: <link>».

**Informe del mes**: «Hola <nombre>, te paso el informe de <mes>: <número> personas los contactaron desde Google (<+x %> que el mes anterior). Lo más importante: <una línea>. Para <mes que viene> te pedimos <lo que necesitamos>. Cualquier duda, me escribís.»
