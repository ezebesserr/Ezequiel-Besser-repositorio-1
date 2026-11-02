# Cómo quiero los diseños

Este archivo manda sobre cualquier otra guía de diseño. Claude lo lee antes de armar cada página.

## La regla de oro: que no parezca hecha por IA

Cada web tiene que parecer hecha a mano para **ese** local. El estilo y los colores se deciden con cada negocio, salen de lo que el local ya es y no se repiten de un cliente a otro.

### De dónde sale el diseño de cada local

- **Colores**: de su logo, su cartel, la fachada, el toldo, los uniformes, las bolsas o el papel con que envuelven. `identidad.py` los saca de su web vieja o de fotos que nos pasen.
- **Letras**: inspiradas en su cartel o en la época del local: un cartel de chapa de los 70, una marquesina, letras pintadas a mano, la tipografía de su logo.
- **Un elemento firma del oficio**: algo que solo ese rubro tiene. En la ferretería, el tablero perforado; en un bodegón, la pizarra con tiza; en un vivero, las etiquetas con el nombre de cada planta. Hay ideas por rubro en `rubros.md`.
- **El barrio**: la calle, la esquina, la estación, el club. Si suma, detalles porteños usados con medida: fileteado, mosaico calcáreo, cartel de chapa, letras de colectivo.
- **Las palabras del local**: cómo hablan, los nombres de sus productos, sus datos reales (desde qué año están, qué hacen distinto).

### Cómo se trabaja

1. Tres palabras de personalidad para el local (por ejemplo: «de barrio, rápido, de confianza»).
2. Tres direcciones distintas de la portada, cada una con su razón. Elegimos una, o la elige el cliente.
3. La paleta sale de un objeto real del local; las letras, de su cartel o de su época.
4. Antes de mostrar, el detector de diseño genérico (`revisar.js`) y la prueba de abajo.
5. Anotar la identidad en `identidades-usadas.md` para no repetirla en otro cliente.

### Prohibido: el sello del diseño hecho por IA

- Letras por defecto: Inter, Poppins, Montserrat, Roboto, Open Sans, Space Grotesk, DM Sans, Lato, Nunito, Raleway, Plus Jakarta Sans, Outfit, Urbanist.
- Degradé de violeta a azul, efecto vidrio, manchas de color flotando, íconos 3D, emojis como íconos.
- La plantilla de siempre: portada centrada con dos botones, tres tarjetas iguales con ícono y testimonios abajo.
- Todas las cajas iguales: el mismo redondeo grande y la misma sombra en todo.
- Fondo crema con títulos en serif y acento terracota. Negro con un solo verde ácido.
- Fotos de bancos de imágenes e ilustraciones genéricas de personitas.
- Testimonios, reseñas, números o años inventados.
- Frases vacías: «Bienvenidos», «somos una empresa líder», «soluciones integrales», «calidad y compromiso», «tu mejor opción», «llevamos tu experiencia al siguiente nivel», «en el corazón de», «pasión por».
- Carruseles que pasan solos, ventanas emergentes, música, contadores de visitas.
- Textos dentro de imágenes y cartas o listas de precios en PDF: van en la página, como texto.

### La prueba antes de mostrar

- Si tapo el nombre, ¿se entiende de qué rubro es y que es de este barrio?
- ¿Hay al menos tres cosas que solo este local tiene (un dato, un objeto, una frase)?
- ¿Se distingue de las otras webs del taller?
- ¿`revisar.js` dice «Diseño genérico: no se detectó nada»?

## Lo que tiene que lograr cada web

1. En 5 segundos se entiende qué venden, dónde están y cómo contactarlos.
2. El botón de WhatsApp está siempre a mano, sobre todo en el celular.
3. Carga rápido con datos móviles.

## Mínimos técnicos

- Primero el celular (390 px) y después la compu (1280 px). Nada se corre de costado.
- Página completa de menos de 1,5 MB; cada imagen de menos de 300 KB y con `alt`.
- Título, descripción, vista previa para compartir y datos estructurados del negocio.
- Accesible: buen contraste, foco visible al navegar con teclado, botones de al menos 44 px.
- Animaciones pocas y suaves, respetando la opción de reducir movimiento.

## Mis gustos (completá esto)

- Webs que me gustan y por qué:
- Colores o estilos que no quiero:
- Otras notas:
