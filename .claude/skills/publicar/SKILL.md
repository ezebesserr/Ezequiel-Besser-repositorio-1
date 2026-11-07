---
name: publicar
description: Publica una muestra o un sitio terminado, genera la imagen para compartir, conecta el dominio del cliente y deja todo listo para entregar. Usar con "publicá…", "subí la muestra", "dame el link para mandarle", "conectá el dominio", "entregá la web".
---

# Publicar

## Muestras (en este repo, con GitHub Pages)

1. La muestra va en `muestras/<rubro>/` (negocio inventado) o `clientes/<negocio>/` (negocio real que todavía no aceptó, con `noindex`).
2. Imagen para compartir: `node .claude/skills/crear-pagina/scripts/revisar.js <carpeta>/index.html <carpeta-temporal> --og <carpeta>/og.jpg`, y en el HTML `og:image` con la URL absoluta.
3. Commit en la rama de trabajo, push y pull request a `main`. GitHub Pages publica desde `main` en uno o dos minutos.
4. Link: `https://ezebesserr.github.io/Ezequiel-Besser-repositorio-1/<carpeta>/`. Antes de pasarlo, confirmá que responde 200 (`curl -sI <link>`). GitHub guarda las respuestas 10 minutos: si alguien lo abrió antes de que se publicara, que recargue o pruebe en una ventana de incógnito.

## Sitio final de un cliente

GitHub Pages no está pensado para alojar sitios comerciales, así que para los clientes conviene **Cloudflare Pages**: el plan gratis permite uso comercial y dominio propio.

1. Repo propio del cliente (`web-<negocio>`) con el `index.html` y sus imágenes.
2. En Cloudflare, crear un proyecto de Pages conectado a ese repo, sin comando de build y con la raíz como carpeta de salida.
3. Dominio: el `.com.ar` queda **a nombre del cliente** en NIC Argentina. Agregarlo como dominio personalizado en Cloudflare y cargar los registros DNS que indique (o delegar los DNS a Cloudflare desde NIC Argentina).
4. Esperar el candado de HTTPS y pasar `revisar.js` sobre la URL final.

## Antes de entregar

Un comando chequea lo que no puede quedar mal y arma lo que se le da al cliente:

```bash
node .claude/skills/publicar/scripts/entrega.js <URL final> --negocio "<nombre>" [--dominio <negocio.com.ar>] [--vence AAAA-MM-DD] \
  [--resenas <link para dejar reseña>] [--abono presencia|presencia-ia|precios|precios-grande|mantenimiento] [--telefono "<su WhatsApp>"] --salida <carpeta-privada>
```

- `chequeo.txt`: noindex, aviso de muestra o «Vista previa», datos a confirmar (`.pendiente`), WhatsApp sin el 9, HTTPS, recursos que no cargan, ancho en el celular, JSON-LD, título, descripción e imagen para compartir. Si algo es grave, sale con código 2: **no se entrega hasta arreglarlo**.
- `entrega.pdf` y `entrega.png`: la hoja para el cliente, con el QR de su web (y el de reseñas, si pasás `--resenas`), lo que tiene que hacer esa semana, cómo pedir cambios, qué incluye su abono (sale de `precios.md`) y cuándo vence su dominio.
- `mensaje.txt`: el mensaje de entrega, con la oferta de Presencia si no tiene abono. Con `--telefono`, imprime el link de WhatsApp listo.

Lo que el comando no puede ver, a mano:

- [ ] Que el WhatsApp, el teléfono, el mail y la dirección sean **los del negocio** (el comando ve el formato, no si son suyos), y los botones probados desde un celular.
- [ ] `revisar.js` sin problemas en compu y celular, incluido el detector de diseño genérico.
- [ ] Mandarle al cliente `entrega.png` (o el PDF) y `mensaje.txt`. La hoja ya le explica cómo pedir cambios y que ponga el link en Google Maps, Instagram y WhatsApp.
