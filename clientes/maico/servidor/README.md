# Servidor del catálogo de MAICO

Panel para que el dueño cargue prendas, precios, talles, stock y fotos, y la API que lee la web (`clientes/maico/index.html`).
Es un Cloudflare Worker en JavaScript, sin dependencias ni build. Prendas, ajustes y fotos van en una base D1 (R2 pide tarjeta para activarse; D1 no).

**Publicado en:** https://maico-catalogo.ronkstudio.workers.dev (cuenta de Cloudflare de Ezequiel). Panel: https://maico-catalogo.ronkstudio.workers.dev/panel

- Panel: `https://<servidor>/panel` (celular o compu). Entra con una clave.
- Catálogo público: `https://<servidor>/api/catalogo` (solo prendas visibles).
- La web lee el catálogo cada vez que se abre. Si el servidor no responde, muestra la copia que trae adentro (`#catalogo-respaldo`).

## Probar en la compu

```bash
cd clientes/maico/servidor
# .dev.vars (no se sube):  ADMIN_PASSWORD=<una clave de 12+ letras>   SITIO_URL=http://127.0.0.1:8099
npx wrangler d1 migrations apply maico-catalogo --local
npx wrangler dev --local --port 8787
```

Para ver la web contra este servidor, servir una copia de `clientes/maico/` con `API_URL = "http://127.0.0.1:8787"`.

## Publicar (una vez)

En la cuenta de Cloudflare que corresponda (la del cliente o la nuestra):

```bash
cd clientes/maico/servidor
npx wrangler d1 create maico-catalogo           # copiar el database_id a wrangler.toml
npx wrangler d1 migrations apply maico-catalogo --remote
npx wrangler secret put ADMIN_PASSWORD          # la clave del dueño, 12+ letras
npx wrangler deploy                             # devuelve https://maico-catalogo.<cuenta>.workers.dev
```

Después, en `clientes/maico/index.html`, poner esa dirección en `API_URL` y publicar la web.

## Cosas a saber

- **Seguridad**: la clave es un secreto de Cloudflare (nunca en el repo). La sesión es una cookie firmada, `HttpOnly`, `Secure`, `SameSite=Strict`, de 30 días. Lo que modifica datos exige venir del propio panel (origen y encabezado `x-panel`). Si la clave se filtra: `npx wrangler secret put ADMIN_PASSWORD` con una nueva cierra todas las sesiones.
- **Fotos**: el panel las achica en el celular (lado mayor 1400 px, JPEG, unos 150 KB) antes de subirlas; el servidor acepta hasta 1,5 MB (D1 guarda hasta 2 MB por fila). Se guardan en la tabla `fotos` y se sirven con caché larga. Al cambiar o borrar una prenda se borra su foto vieja.
- **Precios**: en pesos, sin descuento. Sin precio, la web muestra "Consultá precio" y en el carrito queda "a confirmar".
- **Copia de respaldo**: cuando se republica la web, actualizar `#catalogo-respaldo` con lo que devuelve `/api/catalogo` (cambiando `fotoUrl` por `foto` si son fotos del repo).
- **Costos**: con el plan gratis de Workers y D1 (5 GB) alcanza para un local de este tamaño (revisar los límites vigentes en la página de Cloudflare).
- **Registros**: Workers Logs y Traces están activados; los errores salen como JSON en el panel de Cloudflare.
