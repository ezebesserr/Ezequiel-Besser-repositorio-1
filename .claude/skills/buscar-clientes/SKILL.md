---
name: buscar-clientes
description: Busca comercios y pymes de CABA y el GBA (u otra zona) con sitio web viejo, feo o roto, y arma la lista de prospectos con capturas, zona, contacto y paquete sugerido. Usar con "buscá clientes", "encontrá negocios con webs feas en <barrio>", "auditá la web de <negocio>".
---

# Buscar clientes

Los scripts están en `.claude/skills/buscar-clientes/scripts/`. Trabajá en una carpeta temporal (el scratchpad) y **no subas los resultados al repo**, que es público: entregalos como archivo CSV o como página privada.

## Pasos

1. **Datos**: `curl -sO https://download.bbbike.org/osm/bbbike/BuenosAires/BuenosAires.osm.pbf` (CABA y GBA, unos 40 MB) y `pip install osmium`.
2. **Candidatos**: `python3 extract.py BuenosAires.osm.pbf candidatos.json [minlat,minlon,maxlat,maxlon]`. El recorte es opcional y sirve para un barrio. Ya saca cadenas, bancos, escuelas y links a redes sociales.
3. **Puntaje**: `python3 scan.py candidatos.json escaneados.json`. Suma puntos por Flash, frames, `<font>`, maquetado con tablas, spacer.gif, contador de visitas, "en construcción", editores viejos, copyright de hace más de 6 años, falta de viewport (no se adapta al celular), falta de HTTPS y hosting gratuito.
4. **Preselección**: `python3 shortlist.py escaneados.json preseleccion.json 6`. Saca plazas, museos, embajadas y fichas en sitios de terceros.
5. **Capturas**: `node shoot.js preseleccion.json capturas capturas.json`. Toma compu y celular, y junta teléfonos, WhatsApp, mail e Instagram de cada sitio.
6. **Revisión a ojo**: `python3 sheets.py preseleccion.json capturas hojas` y mirá las hojas. Quedate solo con los que **de verdad se ven viejos**: Flash que hoy sale en blanco, diseño en tablas, letra diminuta, sin versión para celular, "¡Hola mundo!", páginas por defecto del hosting. Descartá los modernos que el escáner marcó de más.
7. **Zona**: `python3 geo.py preseleccion.json zonas.json 0,3,7` (índices elegidos). Devuelve barrio en CABA y localidad y partido en el GBA.

## Qué entregar

Para cada negocio: nombre, rubro, zona, dirección, web, teléfonos, WhatsApp, mail, Instagram, nivel (muy cutre / vieja / sin sitio), qué tiene de cutre en una frase concreta y verificable, y el paquete sugerido según `creador/negocio/precios.md`. Agrupá los que quedan cerca para visitarlos a pie.

## Auditar una web puntual (y mandarla con el primer mensaje)

```bash
node .claude/skills/buscar-clientes/scripts/auditoria.js <url> --negocio "<nombre>" [--muestra <link a un trabajo nuestro>] --salida <carpeta-privada>/<negocio>
```

Saca la primera pantalla en un celular y busca problemas concretos y comprobables: Flash, sin versión para celular, se corre de costado, el WhatsApp sin el 9, sin HTTPS, letra ilegible, sin botón de WhatsApp, cosas que no cargan, frames, © viejo, peso. Deja:

- `auditoria.png` (y `.pdf`): la hoja «Así ve su web un cliente desde el celular», con la captura, lo que encontramos ordenado por gravedad, cómo se arregla y un trabajo nuestro. Se manda por WhatsApp junto con el primer mensaje.
- `observacion.txt`: la frase para el mensaje («Entré a la web de X y vi que …»), que va al campo `observacion` del Mostrador.
- `auditoria.json`: los hallazgos, para elegir la línea a ofrecer.

Si dice «no encontré problemas graves», no es buen prospecto para una web nueva; puede serlo para Presencia (su ficha de Google).

Para una revisión más técnica: `node .claude/skills/crear-pagina/scripts/revisar.js <url> <carpeta>`.

## Después de elegir

Cargá los elegidos en el **Mostrador de ventas** (skill `venta-completa`) como `prospecto`, con la observación de su auditoría y la línea que conviene. De a 10 o 15 por día, que es lo que se manda a mano.

## Cuidado

- Los datos de OpenStreetMap pueden estar viejos: hay que confirmar en Google Maps que el local siga abierto.
- Nominatim acepta como máximo una consulta por segundo (el script ya espera).
- De cada sitio se baja solo la portada, una vez.
