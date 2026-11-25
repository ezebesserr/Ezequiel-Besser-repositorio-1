# Brief: MAICO

> Este repo es público: no anotes acá precios acordados ni datos privados del cliente.

- **Rubro**: ropa de hombre (remeras, pantalones, camperas, buzos).
- **Zona y dirección**: Albarellos 2081, B1640 Martínez (Instagram y Google Maps). Ficha de Maps: https://maps.google.com/?cid=1443213857883379601
- **Web actual**: no tiene.
- **Contacto público** (WhatsApp, teléfono, mail): **falta**. No figura ni en Instagram ni en Google Maps. Mientras no esté, los botones abren el chat de Instagram y copian el mensaje.
- **Redes** (Instagram, Facebook): [@maico.storeoficial](https://www.instagram.com/maico.storeoficial/)
- **Qué venden o qué servicios dan**: ropa de hombre de líneas simples. Marcas que se ven en las fotos: Lonely Minds.
- **Lo que más les importa** (pedidos, turnos, reservas, presupuestos): pedidos por WhatsApp desde un carrito; el dueño carga prendas, precios, talles y stock desde su panel.
- **Horarios** (Google Maps): lunes a viernes de 10 a 14 y de 16 a 19; sábado de 10:30 a 18; domingo cerrado. Ojo: el bio de Instagram dice "10 a 13:30": confirmar cuál vale.
- **En Google**: 5,0 con 43 reseñas (noviembre de 2026).
- **Zonas de envío o de trabajo**: falta (no sabemos si hacen envíos).
- **Medios de pago**: 25% off por transferencia y 3 cuotas sin interés (del bio).
- **Logo, colores y fotos disponibles**: logo MAICO en letras blancas corpóreas sobre cartel negro con listones horizontales a los costados (frente del local). Fotos de prendas: las 12 últimas publicaciones de Instagram (miniaturas de 640 px). Fotos del local: frente, mostrador, percheros y vidriera, de la ficha de Google Maps (confirmar con el local que se pueden usar; pedir originales).
- **Paquete y extras**: Catálogo con panel propio (Cloudflare Worker + D1 + R2, en `servidor/`), en lugar de la planilla de Google. El panel no está en `precios.md`: cotizarlo como extra.
- **Estado**: muestra.
- **Notas de diseño**:
  - Personalidad: sobria, prolija, de zona norte.
  - Paleta: negro del cartel `#000`, listones `#2a2a2a`, pared blanca `#f6f6f4`, porcelanato brillante `#e6e1d9`, topo `#8b8178` y oliva `#4f5536` (las prendas).
  - Letras: Lexend Exa (ancha y geométrica, como el logo espaciado) + Instrument Sans.
  - Elemento firma: el frente del local (cartel negro con listones y letras corpóreas) reflejado en el porcelanato brillante, y una etiqueta colgante de prenda con las promos.
  - Animación: una sola secuencia al cargar (se arman los listones, se prenden las letras, aparece el reflejo y la etiqueta se balancea); la etiqueta vuelve a balancearse al pasar el mouse. Respeta "reducir movimiento".
  - Tres datos propios: el frente con listones de Albarellos 2081, las promos de pago, el 5,0 en Google.
  - Los nombres de las prendas describen las fotos (no hay textos ni precios en las publicaciones): **confirmarlos con el local**.
  - Se saltó el paso de las tres direcciones: se armó una sola porque el pedido fue hacer la página directamente.

## Para el sitio final

- [x] Servidor publicado en https://maico-catalogo.ronkstudio.workers.dev (cuenta de Cloudflare de Ezequiel, 2026-11-24), con las 11 prendas y sus fotos en D1. `API_URL` ya apunta ahí.
- [ ] Cargar la clave del panel (`npx wrangler secret put ADMIN_PASSWORD`).
- [ ] Pasarle al dueño el link del panel y su clave; que cargue el WhatsApp en Ajustes, y precios y talles de cada prenda.
- [ ] Confirmar el horario de la mañana (Maps dice hasta las 14; Instagram, hasta las 13:30).
- [ ] Nombres reales de las prendas, y precios si los quieren mostrar.
- [ ] Fotos originales en buena calidad.
- [ ] Si hacen envíos y a qué zonas.
- [ ] Sacar `noindex` y los marcadores "Falta".
