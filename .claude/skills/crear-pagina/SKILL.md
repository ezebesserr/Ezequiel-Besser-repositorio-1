---
name: crear-pagina
description: Crea o rediseña la página web de un comercio o pyme (muestra gratis o sitio final) con el estilo del taller, y la revisa en compu y celular. Usar cuando pidan "armá la web de…", "hacé la muestra para…", "rediseñá la página de…", una landing o una web de muestra para un rubro.
---

# Crear una página

## 1. Juntar el material

- Si el negocio tiene web vieja, bajala (`curl -sL <url>`) y sacá de ahí: qué venden, servicios, horarios, dirección, teléfonos, WhatsApp, mail, redes, logo y fotos propias.
- Sacá la captura del "antes": `node .claude/skills/crear-pagina/scripts/revisar.js <url-vieja> <carpeta-temporal>`.
- Completá `clientes/<negocio>/brief.md` copiando `creador/plantilla-brief.md`. Si falta algo importante (horarios, WhatsApp), preguntalo antes de inventarlo.
- Elegí el paquete según `creador/negocio/precios.md`: Esencial (una página), Completa (hasta 5) o Catálogo.

## 2. Decidir el diseño

- Leé `creador/diseno/preferencias.md` (manda) y la sección del rubro en `creador/diseno/rubros.md`.
- Definí en el `:root` del CSS de 4 a 6 colores (sacados del logo o del local), 2 tipografías de Google Fonts y un comentario de una línea con la idea del layout.
- Elegí **un detalle propio del rubro**: en la ferretería son el tablero perforado y las etiquetas de papel madera. Eso es lo que hace que no parezca una plantilla.
- Referencia de calidad y estructura: `muestras/ferreteria/index.html`. Reutilizá su estructura, no su estética.

## 3. Construir

Carpeta: `clientes/<negocio>/`, o `muestras/<rubro>/` si es una muestra con un negocio inventado. Un `index.html` y las imágenes en `img/` (JPG o WebP, menos de 300 KB cada una, todas con `alt`).

Secciones base (adaptalas al rubro):

1. Encabezado fijo con el nombre, un menú corto y el estado "Abierto / Cerrado" si hay horarios (calculado con la hora de Buenos Aires).
2. Portada: qué venden, dónde están y un botón de WhatsApp. Se tiene que entender en 5 segundos.
3. Rubros, productos o servicios.
4. Cómo pedir o cómo trabajan, en pasos.
5. Horarios y ubicación, con link a Google Maps.
6. Preguntas frecuentes: envíos, pagos, zonas.
7. Pie con los datos de contacto en texto.
8. En el celular, barra fija abajo con WhatsApp y Llamar.

Obligatorio en el `<head>`: `<html lang="es">`, `title` (negocio · rubro · barrio), `meta description`, viewport, Open Graph (`og:title`, `og:description` y `og:image` con URL absoluta) y, en negocios reales, JSON-LD `LocalBusiness` con los datos verdaderos.

Contacto:

- WhatsApp: `https://wa.me/549<característica sin 0><número sin 15>?text=<mensaje codificado>`. Ejemplo: 11 15-6256-5048 → `https://wa.me/5491162565048`.
- Teléfono: `tel:+5411XXXXXXXX`.
- En las muestras inventadas, los botones no llaman a nadie: muestran un aviso de que en la web real abrirían el WhatsApp o el teléfono.

Textos: español rioplatense, voseo, frases cortas. Sin "soluciones integrales" ni "líderes del mercado". Contenido real, nunca inventado (ver `CLAUDE.md`).

## 4. Revisar

```bash
node .claude/skills/crear-pagina/scripts/revisar.js clientes/<negocio>/index.html <carpeta-temporal> --og clientes/<negocio>/og.jpg
```

- Corregí todo lo que aparezca en PROBLEMAS y pensá cada AVISO.
- Mirá las dos capturas (`escritorio.jpg` y `celular.jpg`) una vez y arreglá lo que se vea mal.
- Sitio final: sin `noindex`, sin links a "#", y con WhatsApp y teléfono reales.

## 5. Entregar

Commit en la rama de trabajo y push. Mostrá las capturas del antes y el después, y el link donde va a quedar (skill `publicar`).
