# Brief: Papel Nort (Librerías Koruya)

> Este repo es público: no anotes acá precios acordados ni datos privados del cliente. El presupuesto está en un documento privado, fuera del repo.

## Alcance

La web nueva **reemplaza a papelnort.net**, que es el sitio de toda la empresa. Por eso la muestra cubre las cinco sucursales y no solo Martínez. La carpeta se sigue llamando `papel-nort-martinez` porque el link de la muestra ya está publicado.

Falta decidir con ellos qué hacen con la **tienda online** que hoy es papelnort.net. Hay dos opciones en el presupuesto:

- **A · Completa**: la tienda actual (AsimoX) pasa a una dirección aparte, por ejemplo `tienda.papelnort.net`, y la web nueva la enlaza. Hay que confirmar con AsimoX que se pueda.
- **B · Catálogo**: un catálogo con buscador dentro de la web nueva, que se actualiza desde una planilla de Google, reemplaza la tienda. No incluye carrito ni cobro online; Mercado Pago se cotiza aparte.

## Datos del negocio

- **Rubro**: librería y papelera. Su web la define como "centro comercial" de librería y papelería con 10 rubros: Librería (escolar, universitaria y comercial), Escritura, Artística, Accesorios de Informática, Hogar, Gastronomía, Embalaje Comercial, Embalaje Industrial, Regalería y Navidad. Su lema: "Muchas soluciones en un único lugar".
- **Sucursales** (todas de su web):

| Sucursal | Dirección | Lunes a viernes | Sábados | Teléfonos |
|---|---|---|---|---|
| Martínez | Hipólito Yrigoyen 141, entre Tres Sargentos e Italia (B1640). 300 m². Estacionamiento en Hipólito Yrigoyen 51 | 9 a 20 | 9 a 19:30 | 4006-9977 / 4006-9988 |
| San Isidro | Av. Centenario 401, esquina Ituzaingó (B1642). Estacionamiento propio | 9 a 20 | 9 a 19:30 | 4743-6577 / 4743-6768 |
| Acassuso | Perú 199, esquina Manzone (B1641) | 9 a 20 | 9 a 14 | 4733-3218 / 4793-8369 |
| Lomas de San Isidro | Sucre 2181, Beccar (B1643) | 9 a 20 | 9 a 14 | 5290-4417 / 5290-4418 |
| Victoria | Santa Marina 1192, entre Constitución y Perón (B1644) | 9 a 13:30 y 16 a 20 | 9 a 13:30 y 16 a 19 | no figura |

  - Domingos: no lo dicen. En la muestra va "Cerrado".
  - OpenStreetMap tiene la de Martínez como "Papel Nort", Hipólito Yrigoyen 145 (nodo 4593190519, -34.4904267, -58.5025874), sobre la vereda de los impares, en la segunda cuadra desde Av. Santa Fe.
  - Algunos directorios viejos nombran Olivos y Nordelta. No están en su web actual y no los usamos.
- **Contacto general**: contacto@papelnort.com, de lunes a viernes de 8 a 18; los sábados derivan a las sucursales (de su página de contacto). WhatsApp: no figura en ningún lado. **Pedirlo.**
- **Recursos humanos**: su página de contacto tiene una búsqueda de vendedor/a de salón. El mail para CVs está en una imagen (`mempleos.gif`) que no pudimos leer. Preguntar si quieren una sección "Trabajá con nosotros".
- **Redes**: página de Facebook "Papel Nort" (facebook.com/PapelNort), "librería comercial y escolar", detrás del login. Instagram: no se encontró.
- **Qué venden**: productos que aparecen en su web: resaltadores Stabilo Boss, Voligoma, témperas Model/Playcolor, repuestos Éxito, cuadernos Alamo, resmas Punax A4, biromes Bic y cajas de archivo Pagoda. Las palabras clave de su web suman cartuchos, tóners, film stretch, cintas, cajas de cartón corrugado, bolsas de polietileno y flejes.
- **Marcas** (banners de su web): Faber-Castell, Ángel Estrada (América, Rivadavia, Arte, El Nene), Pizzini, Avery, M&D Company y Pelikan.
- **Tienda online**: con precios, registro de clientes (consumidor final o responsable inscripto con CUIT) y banner de Mercado Pago.
- **Medios de pago en los locales**: no figuran.
- **Logo, colores y fotos disponibles**:
  - El banner de su web dice **"Librerías KORUYA – Una empresa Papel Nort"**. El logo es un búho dentro de un pin de mapa que termina en punta de lápiz: cuerpo óxido (#c0542a), cara negra y ojos amarillos (#f2d533). El búho está posado en un cable con palomas, sobre un cielo. En la muestra está **redibujado en SVG**: hay que pedir el original.
  - Koruya fue una cadena de librerías de autoservicio de la familia Dalul (abrió en 2005; "koruya" viene de *coruja*, búho en portugués; El Cronista, 2010 y 2011). Hoy la marca figura como "una empresa Papel Nort".
  - Su web vieja usa Century Gothic y Verdana, con etiquetas de precio naranjas.
  - Fotos: no hay fotos de los locales. Las de productos son chicas (unos 100 px).

## Web actual, dominios y mail

- **Web**: http://www.papelnort.net/ (tienda armada con AsimoX, con tablas, banners de marcas en imágenes, sin `viewport`, así que en el celular se ve en miniatura, y sin `h1`). http://www.papelnort.com/ muestra lo mismo.
- **HTTPS**: desde esta sesión no pudimos abrirla por https (el proxy cortó la conexión), pero crt.sh muestra certificados emitidos para `*.papelnort.net` cada dos meses (el último, del 21/8/2026). **No digas que no tiene HTTPS hasta probarlo en un navegador.**
- **Dominios**: papelnort.net (registrado en 2009, vence el 12/11/2027, Tucows) y papelnort.com (registrado en 2005, vence el 10/6/2027, Wild West Domains). Los dos con los DNS en BAEHost (ns9, ns10 y ns11.baehost.com).
- **DNS (noviembre de 2026)**: la web de los dos dominios apunta a 168.205.94.41 (`www.papelnort.net` es un CNAME a `papelnort.net`). El mail va aparte: MX `mail.papelnort.net` y `mail.papelnort.com`, registros A a 170.78.72.12. Cambiar la web no toca el mail, siempre que no se toquen esos registros.
- **Plan técnico para el cambio** (Cloudflare Pages, ver skill `publicar`): `www` con un CNAME a `<proyecto>.pages.dev` desde el panel de BAEHost; el dominio sin `www`, con una redirección a `www` desde BAEHost o pasando los DNS a Cloudflare. Si se pasan los DNS, recrear antes `mail.*`, `webmail.*` y los MX tal cual están.

## Para el sitio final

- Sacar el `noindex`, la línea "Vista previa preparada por…" y todos los "dato a confirmar".
- `og:url`, `og:image` y el `url` del JSON-LD a `https://www.papelnort.net/`.
- Los links a la tienda online, a donde quede la tienda (opción A) o al catálogo nuevo (opción B).
- WhatsApp real en la portada, en la barra del celular y en el JSON-LD.

## Datos a confirmar con el negocio

- **Qué nombre usan hoy en los carteles**: Papel Nort, Koruya o los dos. En la muestra va "Papel Nort" grande y "Librerías Koruya" chico.
- Qué quieren hacer con la tienda (opción A o B).
- WhatsApp y teléfono de la sucursal Victoria.
- Si abren los feriados y si los domingos están cerrados.
- Si hacen envíos, a qué zonas y desde qué monto.
- Medios de pago en los locales y si hacen factura A en el mostrador.
- Qué incluyen los rubros Hogar, Gastronomía, Regalería y Navidad.
- Si las cinco sucursales siguen abiertas con esos horarios.
- Si el estacionamiento de Hipólito Yrigoyen 51 es propio o con convenio.
- Quién les maneja el dominio en BAEHost y el contacto de AsimoX.

## Notas de diseño

Dirección elegida: A, "Lápiz-búho". Las otras dos (B "Cuaderno y resaltador" y C "Etiqueta escolar y papel glasé") quedaron en `direcciones.html`.

- Personalidad: surtida, práctica, de zona norte.
- Paleta: la de su logo, óxido #c0542a, amarillo lápiz #f2d533 y grafito #161616, sobre blanco y gris claro #f3f3f1.
- Letras: Baloo 2 para los títulos (redonda y pesada como el logotipo KORUYA) y Jost para el texto (geométrica, de la familia de la Century Gothic de su web).
- Elementos firma: el búho en el cable con palomas (de su banner), un lápiz HB con las cinco sucursales grabadas, los rubros como una caja de 10 lápices de colores, las marcas grabadas en un lápiz negro, el horario de las cinco sucursales como el de los cuadernos escolares (con cuáles están abiertas en el momento) y un croquis de Martínez a mano sobre hoja cuadriculada con las calles reales de OpenStreetMap.
- En el celular, la barra fija tiene "Llamar", que abre un menú con el teléfono de cada sucursal, y "Tienda online".
