---
name: contadores
description: Servicio para estudios contables chicos: juntar los comprobantes de cada cliente por WhatsApp o mail, leer las facturas electrónicas (QR de ARCA o texto) a una planilla con lo que hay que revisar marcado, y recordarle a cada cliente sus vencimientos. Usar con "ordená las facturas de…", "pasá estos comprobantes a la planilla", "armá los recordatorios de vencimientos del estudio…", "ofrecele el servicio a un contador".
---

# Contadores: los papeles de los clientes en orden (idea NIC-03)

Al contador lo que más tiempo le come es perseguir y ordenar papeles. Ya hay software para presentar en ARCA; esto entra por el lado que no cubren: **conseguir los comprobantes y dejarlos ordenados**.

## El servicio

1. **Recepción**: cada cliente del estudio manda sus comprobantes a un solo lugar (un WhatsApp Business del estudio, un mail o una carpeta compartida de Google Drive por cliente). Una respuesta rápida les explica cómo: «PDF, no foto; uno por mensaje».
2. **Lectura**, una vez por semana o a fin de mes:

```bash
python3 .claude/skills/contadores/scripts/facturas.py <carpeta del cliente> --salida <carpeta-privada>/<cliente>-<mes> --renombrar
```

   - Primero lee el link del QR de ARCA, que trae fecha, CUIT, tipo, número, importe y CAE exactos. Si no está, lee el texto de la factura.
   - Deja `comprobantes.xlsx`, con una fila por comprobante y el resumen por mes y por emisor, y marca en rojo lo que hay que revisar: CUIT que no pasa el dígito verificador, el texto que no coincide con el QR, neto más IVA que no da el total, o lo que falta.
   - Con `--renombrar`, deja copias con nombre `AAAA-MM-DD_CUIT_tipo_PV-número.pdf` ordenadas por mes. Los originales no se tocan.
3. **Recordatorios de vencimientos**: una planilla con `nombre`, `telefono`, `acepta`, `obligacion` y `vence` por cliente. Las fechas las pone el contador; no las calculamos nosotros. La cola de envío es la misma de las campañas:

```bash
node .claude/skills/redes-y-campanas/scripts/campana.js <carpeta-privada>/vencimientos.csv <carpeta-privada>/recordatorio.json --salida <carpeta-privada>/vencimientos-<mes>
```

   con un mensaje como «Hola {nombre}, te recuerdo que el {vence} vence {obligacion}. Si todavía no me mandaste los comprobantes del mes, mandalos por acá. Estudio <nombre>».

## Reglas

- Los datos de los clientes del estudio son sensibles: **nunca** a este repo, ni a una página pública. Carpetas privadas del estudio y archivos que se entregan.
- Lo que la planilla marca para revisar lo revisa una persona. El script no inventa importes: si no lee con seguridad, lo dice.
- No hacemos liquidaciones ni presentaciones: eso es del contador.

## Cómo venderlo

1. Entrevistar a dos contadores de la zona: cómo reciben hoy los papeles, cuántos clientes y comprobantes por mes, qué les gustaría no hacer más.
2. Prueba gratis con un cliente del estudio: 50 facturas reales a la planilla, y medir cuántas salen bien.
3. Con la prueba, la propuesta: precio en `creador/negocio/precios.md` (sección «Contadores»).

**Mensaje para el primer contacto**: "Hola, ¿qué tal? Soy <nombre>, <presentación>. Trabajo con estudios contables chicos en una parte que les come mucho tiempo: juntar los comprobantes de los clientes y pasarlos a la planilla. Las facturas se leen solas (con el QR de ARCA) y queda marcado lo que hay que revisar. ¿Le sirve que le muestre cómo queda con 50 facturas de un cliente suyo, sin cargo?"
