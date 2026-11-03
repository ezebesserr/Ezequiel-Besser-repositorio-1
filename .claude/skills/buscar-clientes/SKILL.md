---
name: buscar-clientes
description: Busca comercios y pymes de CABA y el GBA (u otra zona) con sitio web viejo, feo o roto, y arma la lista de prospectos con capturas, zona, contacto y paquete sugerido. Usar con "buscá clientes", "encontrá negocios con webs feas en <barrio>", "auditá la web de <negocio>".
---

# Buscar clientes

Los scripts están en `.claude/skills/buscar-clientes/scripts/`. Trabajá en una carpeta temporal (el scratchpad) y **no subas los resultados al repo**, que es público: entregalos como archivo CSV o como página privada.

## Pasos

1. **Datos**: `curl -sO https://download.bbbike.org/osm/bbbike/BuenosAires/BuenosAires.osm.pbf` (CABA y GBA, unos 40 MB) y `pip install osmium`. Para ampliar a La Plata, Campana, Luján o Moreno: el mapa de la provincia y `python3 extract_zona.py mapa.osm.pbf candidatos.json 75 ya_revisados.json`.
2. **Candidatos**: `python3 extract.py BuenosAires.osm.pbf candidatos.json [minlat,minlon,maxlat,maxlon]`. El recorte es opcional y sirve para un barrio. Ya saca cadenas, bancos, escuelas y links a redes sociales.
3. **Puntaje**: `python3 scan.py candidatos.json escaneados.json`. Suma puntos por Flash, frames, `<font>`, maquetado con tablas, spacer.gif, contador de visitas, "en construcción", editores viejos, copyright de hace más de 6 años, falta de viewport (no se adapta al celular), falta de HTTPS y hosting gratuito.
4. **Preselección**: `python3 shortlist.py escaneados.json preseleccion.json 6`. Saca plazas, museos, embajadas y fichas en sitios de terceros.
5. **Capturas**: `node shoot.js preseleccion.json capturas capturas.json`. Toma compu y celular, y junta teléfonos, WhatsApp, mail e Instagram de cada sitio.
6. **Revisión a ojo**: `python3 sheets.py preseleccion.json capturas hojas` y mirá las hojas. Quedate solo con los que **de verdad se ven viejos**: Flash que hoy sale en blanco, diseño en tablas, letra diminuta, sin versión para celular, "¡Hola mundo!", páginas por defecto del hosting. Descartá los modernos que el escáner marcó de más.
7. **Zona**: `python3 geo.py preseleccion.json zonas.json 0,3,7` (índices elegidos). Devuelve barrio en CABA y localidad y partido en el GBA.
8. **¿Ya tiene web nueva?** `python3 otro_dominio.py negocios.json salida.json`. Prueba dominios parecidos y los links de su web vieja. Abrí cada candidato y confirmá teléfono o dirección: si el negocio ya tiene una web nueva y moderna, sacalo de la lista y anotá el dominio. Para los más valiosos, buscalos también en la web por nombre y barrio.
9. **Estrellas**: marcá primero los que más conviene encarar: negocios que pueden pagar (históricos, hoteles, salud, inmobiliarias, con sucursales o con prensa), con una web que se ve mal a simple vista, con contacto directo y sin web nueva en otro lado.

## Qué entregar

Para cada negocio: nombre, rubro, zona, dirección, web, teléfonos, WhatsApp, mail, Instagram, nivel (muy cutre / vieja / sin sitio), qué tiene de cutre en una frase concreta y verificable, y el paquete sugerido según `creador/negocio/precios.md`. Agrupá los que quedan cerca para visitarlos a pie.

## Auditar una web puntual

`node .claude/skills/crear-pagina/scripts/revisar.js <url> <carpeta>` y contá lo que se ve: qué no carga, cómo queda en el celular, si el navegador dice "No seguro".

## Cuidado

- Los datos de OpenStreetMap pueden estar viejos: hay que confirmar en Google Maps que el local siga abierto.
- Nominatim acepta como máximo una consulta por segundo (el script ya espera).
- De cada sitio se baja solo la portada, una vez.
