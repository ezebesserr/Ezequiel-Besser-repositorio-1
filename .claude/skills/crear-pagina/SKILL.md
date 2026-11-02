---
name: crear-pagina
description: Crea o rediseña la página web de un comercio o pyme (muestra gratis o sitio final) a partir de la identidad real del local, para que no parezca hecha por IA, y la revisa en compu y celular. Usar cuando pidan "armá la web de…", "hacé la muestra para…", "rediseñá la página de…", una landing o una web de muestra para un rubro.
---

# Crear una página

La regla de oro está en `creador/diseno/preferencias.md`: cada web sale de lo que el local ya es y no puede parecer hecha por IA. El estilo y los colores se deciden con cada negocio.

## 1. Juntar el material

- Si el negocio tiene web vieja, bajala (`curl -sL <url>`) y sacá de ahí: qué venden, servicios, horarios, dirección, teléfonos, WhatsApp, mail, redes, logo y fotos propias.
- Sacá la captura del "antes": `node .claude/skills/crear-pagina/scripts/revisar.js <url-vieja> <carpeta-temporal>`.
- Completá `clientes/<negocio>/brief.md` copiando `creador/plantilla-brief.md`. Si falta algo importante (horarios, WhatsApp), preguntalo antes de inventarlo.
- Elegí el paquete según `creador/negocio/precios.md`: Esencial (una página), Completa (hasta 5) o Catálogo.

## 2. Sacar la identidad del local

```bash
python3 .claude/skills/crear-pagina/scripts/identidad.py <url-de-su-web> <carpeta-temporal>
python3 .claude/skills/crear-pagina/scripts/identidad.py foto-del-cartel.jpg logo.png
```

Devuelve los colores de su logo e imágenes, una paleta sugerida con el contraste revisado y datos reales para los textos (nombre, años de trayectoria, secciones). Si la web no muestra nada o no tiene marca, pedí fotos del cartel, la fachada o el logo.

Con eso, escribí en el brief:

- **Tres palabras de personalidad** (por ejemplo: «de barrio, rápido, de confianza»).
- **De dónde sale la paleta**: un objeto real del local (logo, cartel, toldo, bolsas).
- **De dónde salen las letras**: su cartel, su logo o la época del local. Nunca las letras prohibidas de `preferencias.md`.
- **El elemento firma del oficio** (ideas en `creador/diseno/rubros.md`).
- **Tres datos que solo este local tiene** (desde cuándo está, un producto propio, la esquina).

Revisá `creador/diseno/identidades-usadas.md`: no repitas paleta, letras ni elemento firma de otro cliente.

## 3. Tres direcciones

Armá tres portadas distintas (solo la primera pantalla, en compu y celular), cada una con su personalidad, paleta, letras y elemento firma, y una línea que explique de dónde sale. Mostralas como página privada (Artifact) o en `clientes/<negocio>/direcciones.html` con `noindex`. Que el usuario elija una (o la elija el cliente) antes de hacer la página completa.

## 4. Construir

Carpeta: `clientes/<negocio>/`, o `muestras/<rubro>/` si es una muestra con un negocio inventado. Un `index.html` y las imágenes en `img/` (JPG o WebP, menos de 300 KB cada una, todas con `alt`). La estructura de `muestras/ferreteria/index.html` sirve de referencia; la estética, no.

Secciones base (adaptalas al rubro):

1. Encabezado fijo con el nombre, un menú corto y el estado "Abierto / Cerrado" si hay horarios (calculado con la hora de Buenos Aires).
2. Portada: qué venden, dónde están y un botón de WhatsApp. Se tiene que entender en 5 segundos.
3. Rubros, productos o servicios.
4. Cómo pedir o cómo trabajan, en pasos.
5. Horarios y ubicación, con link a Google Maps.
6. Preguntas frecuentes: envíos, pagos, zonas.
7. Pie con los datos de contacto en texto.
8. En el celular, barra fija abajo con WhatsApp y Llamar.

Variá la composición entre clientes: no todas las portadas centradas ni todas las grillas de tres tarjetas. Cada bloque se diseña según lo que es (un horario parece un horario, una carta parece una carta).

Obligatorio en el `<head>`: `<html lang="es">`, `title` (negocio · rubro · barrio), `meta description`, viewport, Open Graph (`og:title`, `og:description` y `og:image` con URL absoluta) y, en negocios reales, JSON-LD `LocalBusiness` con los datos verdaderos.

Contacto:

- WhatsApp: `https://wa.me/549<característica sin 0><número sin 15>?text=<mensaje codificado>`. Ejemplo: 11 15-6256-5048 → `https://wa.me/5491162565048`.
- Teléfono: `tel:+5411XXXXXXXX`.
- En las muestras inventadas, los botones no llaman a nadie: muestran un aviso de que en la web real abrirían el WhatsApp o el teléfono.

Textos: español rioplatense, frases cortas, con los datos y las palabras del local. Nada de las frases prohibidas de `preferencias.md`. Contenido real, nunca inventado (ver `CLAUDE.md`).

## 5. Revisar

```bash
node .claude/skills/crear-pagina/scripts/revisar.js clientes/<negocio>/index.html <carpeta-temporal> --og clientes/<negocio>/og.jpg
```

- Corregí todo lo que aparezca en PROBLEMAS y pensá cada AVISO.
- **DISEÑO GENÉRICO** tiene que decir «no se detectó nada». Si marca algo, cambialo.
- Mirá las dos capturas (`escritorio.jpg` y `celular.jpg`) y hacé la prueba de `preferencias.md`: si tapo el nombre, ¿se entiende de qué local es?
- Sitio final: sin `noindex`, sin links a "#", y con WhatsApp y teléfono reales.

## 6. Entregar y anotar

- Sumá una fila en `creador/diseno/identidades-usadas.md`.
- Commit en la rama de trabajo y push. Mostrá las capturas del antes y el después, y el link donde va a quedar (skill `publicar`).
