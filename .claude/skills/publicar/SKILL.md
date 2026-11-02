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

- [ ] Sin `noindex`. Title, description, Open Graph y JSON-LD con los datos reales.
- [ ] WhatsApp, teléfono, mail y dirección verdaderos, con los links probados.
- [ ] `revisar.js` sin problemas en compu y celular.
- [ ] Imágenes livianas y con `alt`.
- [ ] Pedirle al cliente que actualice el link de la web en su ficha de Google Maps y en Instagram.
- [ ] Explicarle cómo pedir cambios y qué cubre el mantenimiento.
