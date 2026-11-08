---
name: inmobiliarias
description: Servicio para inmobiliarias de barrio: fichas de propiedades en PDF con textos para portales, WhatsApp e Instagram, fotos con ambientación virtual siempre avisada, y su catálogo de propiedades en la web. Usar con "armá las fichas de las propiedades de…", "ambientá este departamento", "textos para Zonaprop de…", "ofrecele el servicio a una inmobiliaria".
---

# Inmobiliarias: fichas, fotos y ambientación virtual (idea NIC-01)

Las inmobiliarias publican decenas de propiedades y venden por la foto. Tres servicios, de menor a mayor:

1. **Fichas**: por cada propiedad, la ficha en PDF para mandar por WhatsApp e imprimir, y los textos para el portal, WhatsApp e Instagram.
2. **Ambientación virtual**: ambientes vacíos amueblados con una app de IA (cuestan de USD 0,4 a 1 por foto en planes por volumen).
3. **Catálogo de propiedades en su web**: el paquete Catálogo de `catalogo-vivo`, con filtros por operación, barrio, ambientes y precio, cargado desde la misma planilla.

## Fichas

```bash
node .claude/skills/inmobiliarias/scripts/fichas.js <carpeta-privada>/propiedades.csv <carpeta-privada>/inmobiliaria.json --salida <carpeta-privada>/fichas
```

- La planilla tiene una fila por propiedad. Mirá `ejemplo/propiedades.csv`: datos, destacados separados por `|`, rutas de fotos y cuáles tienen ambientación virtual.
- `inmobiliaria.json` lleva el nombre, el corredor responsable y su matrícula, el WhatsApp, los colores y las letras de su marca. **Sin matrícula no arma nada:** en CABA y en Provincia tiene que figurar en cada aviso.
- Deja, por propiedad, `ficha.pdf`, `ficha.png` (para WhatsApp) y `textos.txt` (título y descripción para el portal, mensaje de WhatsApp, posteo de Instagram).
- Los textos se escriben con los datos reales de la propiedad: nada de «espectacular», «única» ni metros que no figuran en la planilla.

## Ambientación virtual: reglas

- Se amuebla, no se reforma: no se tocan paredes, aberturas, vistas, pisos ni el estado de la propiedad.
- **Siempre avisada**: en la planilla, la columna `ambientadas` marca qué fotos tienen ambientación. La ficha les estampa «Ambientación virtual» y los textos lo aclaran. Siempre va también la foto original del ambiente vacío.
- Las fotos son de la inmobiliaria. Nunca se inventa una propiedad, un ambiente ni una vista.

## Cómo venderlo

1. Buscar inmobiliarias con la web vieja: `buscar-clientes`, rubro `office=estate_agent`. Otra señal: muchas propiedades en portales pero sin catálogo propio.
2. Muestra gratis: las fichas de tres de sus propiedades publicadas y una foto de un ambiente vacío ambientada, con el antes y el después.
3. Propuesta: fichas por propiedad o un abono mensual, y el catálogo en la web para las más grandes. Precios en `creador/negocio/precios.md` (sección «Inmobiliarias»).

**Mensaje para el primer contacto**: "Hola, ¿qué tal? Soy <nombre>, <presentación>. Vi que publican <n> propiedades en <portal> y que en su web <observación>. Les armo sin cargo la ficha de tres de sus propiedades, lista para mandar por WhatsApp, y les amueblo con IA una foto de un ambiente vacío (siempre aclarado como ambientación virtual), para que vean el antes y el después. ¿Les interesa?"
