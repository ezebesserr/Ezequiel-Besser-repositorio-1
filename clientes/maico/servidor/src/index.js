// Servidor del catálogo de MAICO (Cloudflare Worker, JavaScript sin dependencias).
//
//   GET  /api/catalogo            catálogo público (prendas visibles y ajustes), lo lee la web
//   GET  /fotos/<clave>           fotos subidas desde el panel (tabla fotos de D1)
//   GET  /panel                   panel del dueño
//   POST /api/admin/entrar        { clave }  -> cookie de sesión firmada
//   POST /api/admin/salir
//   GET  /api/admin/sesion
//   GET  /api/admin/prendas       todas, también las ocultas
//   POST /api/admin/prendas       nueva prenda
//   PUT  /api/admin/prendas/<id>  editar
//   DELETE /api/admin/prendas/<id>
//   POST /api/admin/orden         { ids: [...] }
//   PUT  /api/admin/ajustes       { whatsapp, descuento_transferencia, cuotas }
//   POST /api/admin/fotos         cuerpo = la imagen (JPEG/WebP/PNG, hasta 1,5 MB) -> { foto: "foto:<clave>" }
import PANEL from "./panel.html";

const COOKIE = "maico_sesion";
const SESION_SEGUNDOS = 60 * 60 * 24 * 30; // 30 días: el dueño entra desde su celular
const MAX_FOTO = 1_500_000; // D1 guarda hasta 2 MB por fila; el panel las sube de unos 150 KB
const TIPOS_FOTO = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" };
const enc = new TextEncoder();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      return await rutear(request, env, url, ctx);
    } catch (e) {
      if (e instanceof ErrorDeDatos) return json({ error: e.message }, 400);
      console.error(JSON.stringify({ msg: "error", ruta: url.pathname, metodo: request.method, error: String(e && e.stack || e) }));
      return json({ error: "Algo falló en el servidor. Probá de nuevo en un rato." }, 500);
    }
  },
};

class ErrorDeDatos extends Error {}

async function rutear(request, env, url, ctx) {
  const { pathname } = url;
  const metodo = request.method;

  if (pathname === "/" ) return Response.redirect(url.origin + "/panel", 302);
  if (pathname === "/panel" || pathname === "/panel/") {
    return new Response(PANEL, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-frame-options": "DENY",
        "referrer-policy": "same-origin",
      },
    });
  }

  // ---------- Público ----------
  if (pathname === "/api/catalogo") {
    if (metodo === "OPTIONS") return new Response(null, { headers: corsPublico() });
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    const [prendas, ajustes] = await Promise.all([leerPrendas(env, url, true), leerAjustes(env)]);
    return json({ ajustes, prendas }, 200, { ...corsPublico(), "cache-control": "public, max-age=30" });
  }

  if (pathname.startsWith("/fotos/") && metodo === "GET") {
    const clave = decodeURIComponent(pathname.slice("/fotos/".length));
    if (!/^[a-f0-9-]{36}\.(jpg|webp|png)$/.test(clave)) return new Response("No existe", { status: 404 });
    // Primero la caché del borde, así la base no se lee en cada visita.
    const cache = caches.default;
    const enCache = await cache.match(request);
    if (enCache) return enCache;
    const fila = await env.DB.prepare("SELECT tipo, datos FROM fotos WHERE clave = ?").bind(clave).first();
    if (!fila) return new Response("No existe", { status: 404 });
    const datos = fila.datos instanceof ArrayBuffer ? fila.datos : new Uint8Array(fila.datos);
    const res = new Response(datos, {
      headers: {
        "content-type": fila.tipo,
        "cache-control": "public, max-age=31536000, immutable", // cada foto nueva tiene clave nueva
        "access-control-allow-origin": "*",
      },
    });
    ctx.waitUntil(cache.put(request, res.clone()));
    return res;
  }

  // ---------- Panel ----------
  if (!pathname.startsWith("/api/admin/")) return json({ error: "No existe" }, 404);

  const clave = env.ADMIN_PASSWORD;
  if (!clave || clave.length < 12) return json({ error: "Falta configurar ADMIN_PASSWORD (mínimo 12 caracteres). Ver README." }, 500);

  // Todo lo del panel se usa desde el mismo servidor: si el pedido viene de otro sitio, no se atiende.
  if (metodo !== "GET") {
    const origen = request.headers.get("origin");
    if (origen && origen !== url.origin) return json({ error: "Origen no permitido" }, 403);
    if (request.headers.get("x-panel") !== "1") return json({ error: "Falta el encabezado del panel" }, 403);
  }

  const ruta = pathname.slice("/api/admin/".length);

  if (ruta === "entrar" && metodo === "POST") {
    const body = await leerJson(request);
    const dada = typeof body.clave === "string" ? body.clave : "";
    if (!(await mismoSecreto(dada, clave))) {
      await new Promise((r) => setTimeout(r, 900)); // frena los intentos en serie
      return json({ error: "Clave incorrecta" }, 401);
    }
    const cookie = await crearSesion(clave);
    return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=${cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESION_SEGUNDOS}` });
  }

  if (ruta === "salir" && metodo === "POST") {
    return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  const conSesion = await sesionValida(request, clave);
  if (ruta === "sesion") return json({ sesion: conSesion });
  if (!conSesion) return json({ error: "Tu sesión venció. Entrá de nuevo." }, 401);

  if (ruta === "prendas" && metodo === "GET") {
    const [prendas, ajustes] = await Promise.all([leerPrendas(env, url, false), leerAjustes(env)]);
    return json({ prendas, ajustes, sitio: env.SITIO_URL });
  }

  if (ruta === "prendas" && metodo === "POST") {
    const p = validarPrenda(await leerJson(request));
    const id = await nuevoId(env, p.nombre);
    const { max } = await env.DB.prepare("SELECT COALESCE(MAX(orden), 0) AS max FROM prendas").first();
    await env.DB.prepare(
      `INSERT INTO prendas (id, nombre, categoria, precio, foto, alt, ig, talles, agotado, visible, destacada, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, p.nombre, p.categoria, p.precio, p.foto, p.alt, p.ig, JSON.stringify(p.talles), +p.agotado, +p.visible, +p.destacada, max + 1).run();
    return json({ ok: true, id }, 201);
  }

  const m = ruta.match(/^prendas\/([a-z0-9-]{1,80})$/);
  if (m && metodo === "PUT") {
    const p = validarPrenda(await leerJson(request));
    const antes = await env.DB.prepare("SELECT foto FROM prendas WHERE id = ?").bind(m[1]).first();
    if (!antes) return json({ error: "Esa prenda ya no existe" }, 404);
    await env.DB.prepare(
      `UPDATE prendas SET nombre = ?, categoria = ?, precio = ?, foto = ?, alt = ?, ig = ?, talles = ?, agotado = ?, visible = ?,
       destacada = ?, actualizado = datetime('now') WHERE id = ?`
    ).bind(p.nombre, p.categoria, p.precio, p.foto, p.alt, p.ig, JSON.stringify(p.talles), +p.agotado, +p.visible, +p.destacada, m[1]).run();
    if (antes.foto !== p.foto) await borrarFoto(env, antes.foto);
    return json({ ok: true });
  }
  if (m && metodo === "DELETE") {
    const antes = await env.DB.prepare("SELECT foto FROM prendas WHERE id = ?").bind(m[1]).first();
    if (!antes) return json({ ok: true });
    await env.DB.prepare("DELETE FROM prendas WHERE id = ?").bind(m[1]).run();
    await borrarFoto(env, antes.foto);
    return json({ ok: true });
  }

  if (ruta === "orden" && metodo === "POST") {
    const { ids } = await leerJson(request);
    if (!Array.isArray(ids) || ids.length > 500 || !ids.every((x) => typeof x === "string")) throw new ErrorDeDatos("Orden inválido");
    await env.DB.batch(ids.map((id, i) => env.DB.prepare("UPDATE prendas SET orden = ? WHERE id = ?").bind(i + 1, id)));
    return json({ ok: true });
  }

  if (ruta === "ajustes" && metodo === "PUT") {
    const a = validarAjustes(await leerJson(request));
    await env.DB.batch(Object.entries(a).map(([k, v]) =>
      env.DB.prepare("INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").bind(k, String(v))));
    return json({ ok: true, ajustes: a });
  }

  if (ruta === "fotos" && metodo === "POST") {
    const tipo = (request.headers.get("content-type") || "").split(";")[0].trim();
    const ext = TIPOS_FOTO[tipo];
    if (!ext) throw new ErrorDeDatos("La foto tiene que ser JPG, WebP o PNG.");
    const largo = Number(request.headers.get("content-length") || 0);
    if (largo > MAX_FOTO) throw new ErrorDeDatos("La foto pesa más de 1,5 MB.");
    const datos = await request.arrayBuffer(); // acotado a 1,5 MB arriba y abajo
    if (!datos.byteLength || datos.byteLength > MAX_FOTO) throw new ErrorDeDatos("La foto está vacía o pesa más de 1,5 MB.");
    const claveFoto = `${crypto.randomUUID()}.${ext}`;
    await env.DB.prepare("INSERT INTO fotos (clave, tipo, datos) VALUES (?, ?, ?)").bind(claveFoto, tipo, datos).run();
    return json({ ok: true, foto: "foto:" + claveFoto, url: `${url.origin}/fotos/${claveFoto}` }, 201);
  }

  return json({ error: "No existe" }, 404);
}

// ---------- Datos ----------

async function leerPrendas(env, url, soloVisibles) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM prendas ${soloVisibles ? "WHERE visible = 1" : ""} ORDER BY orden, nombre`
  ).all();
  return results.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    categoria: r.categoria,
    precio: r.precio,
    foto: r.foto,
    fotoUrl: urlFoto(r.foto, env, url),
    alt: r.alt || r.nombre,
    ig: r.ig,
    talles: JSON.parse(r.talles || "[]"),
    agotado: !!r.agotado,
    visible: !!r.visible,
    destacada: !!r.destacada,
  }));
}

async function leerAjustes(env) {
  const { results } = await env.DB.prepare("SELECT clave, valor FROM ajustes").all();
  const a = Object.fromEntries(results.map((r) => [r.clave, r.valor]));
  return {
    whatsapp: a.whatsapp || "",
    descuento_transferencia: Number(a.descuento_transferencia || 0),
    cuotas: Number(a.cuotas || 1),
  };
}

function urlFoto(foto, env, url) {
  if (!foto) return "";
  if (foto.startsWith("foto:")) return `${url.origin}/fotos/${foto.slice(5)}`;
  if (foto.startsWith("img/")) return `${env.SITIO_URL}/${foto}`;
  return "";
}

async function borrarFoto(env, foto) {
  if (foto && foto.startsWith("foto:")) await env.DB.prepare("DELETE FROM fotos WHERE clave = ?").bind(foto.slice(5)).run();
}

function texto(v, max, nombre, obligatorio = true) {
  const s = typeof v === "string" ? v.trim() : "";
  if (obligatorio && !s) throw new ErrorDeDatos(`Falta ${nombre}.`);
  if (s.length > max) throw new ErrorDeDatos(`${nombre[0].toUpperCase() + nombre.slice(1)} es muy largo (máximo ${max} letras).`);
  return s;
}

function validarPrenda(b) {
  const nombre = texto(b.nombre, 80, "el nombre");
  const categoria = texto(b.categoria, 30, "la categoría");
  let precio = null;
  if (b.precio !== null && b.precio !== undefined && b.precio !== "") {
    precio = Number(b.precio);
    if (!Number.isInteger(precio) || precio < 0 || precio > 50_000_000) throw new ErrorDeDatos("El precio tiene que ser un número entero de pesos.");
  }
  const foto = typeof b.foto === "string" ? b.foto : "";
  if (foto && !/^(img\/[a-z0-9-]+\.(jpg|webp|png)|foto:[a-f0-9-]{36}\.(jpg|webp|png))$/.test(foto)) throw new ErrorDeDatos("Foto inválida.");
  const ig = texto(b.ig, 200, "el link de Instagram", false);
  if (ig && !/^https:\/\/(www\.)?instagram\.com\//.test(ig)) throw new ErrorDeDatos("El link tiene que ser de instagram.com.");
  if (!Array.isArray(b.talles) || b.talles.length > 20) throw new ErrorDeDatos("Talles inválidos.");
  const vistos = new Set();
  const talles = b.talles.map((t) => {
    const nombreTalle = texto(t && t.t, 8, "el talle");
    const k = nombreTalle.toUpperCase();
    if (vistos.has(k)) throw new ErrorDeDatos(`El talle ${nombreTalle} está repetido.`);
    vistos.add(k);
    return { t: nombreTalle, stock: t.stock !== false };
  });
  return {
    nombre, categoria, precio, foto, ig, talles,
    alt: texto(b.alt, 200, "la descripción de la foto", false) || nombre,
    agotado: !!b.agotado,
    visible: b.visible !== false,
    destacada: !!b.destacada,
  };
}

function validarAjustes(b) {
  const whatsapp = String(b.whatsapp || "").replace(/\D/g, "");
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) throw new ErrorDeDatos("El WhatsApp tiene que tener entre 10 y 15 números (ej: 5491112345678).");
  const d = Number(b.descuento_transferencia);
  if (!Number.isInteger(d) || d < 0 || d > 90) throw new ErrorDeDatos("El descuento tiene que ser un número entre 0 y 90.");
  const c = Number(b.cuotas);
  if (!Number.isInteger(c) || c < 1 || c > 24) throw new ErrorDeDatos("Las cuotas tienen que ser un número entre 1 y 24.");
  return { whatsapp, descuento_transferencia: d, cuotas: c };
}

async function nuevoId(env, nombre) {
  const base = nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "prenda";
  const existe = await env.DB.prepare("SELECT 1 FROM prendas WHERE id = ?").bind(base).first();
  if (!existe) return base;
  const sufijo = [...crypto.getRandomValues(new Uint8Array(3))].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${base}-${sufijo}`;
}

// ---------- Sesión ----------

async function mismoSecreto(a, b) {
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  return crypto.subtle.timingSafeEqual(x, y);
}

async function llaveSesion(clave) {
  return crypto.subtle.importKey("raw", enc.encode("maico-sesion:" + clave), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function crearSesion(clave) {
  const vence = String(Date.now() + SESION_SEGUNDOS * 1000);
  const firma = await crypto.subtle.sign("HMAC", await llaveSesion(clave), enc.encode(vence));
  return `${vence}.${b64url(firma)}`;
}

async function sesionValida(request, clave) {
  const cookies = request.headers.get("cookie") || "";
  const valor = cookies.split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!valor) return false;
  const [vence, firma] = valor.slice(COOKIE.length + 1).split(".");
  if (!vence || !firma || !/^\d+$/.test(vence) || Number(vence) < Date.now()) return false;
  try {
    return await crypto.subtle.verify("HMAC", await llaveSesion(clave), deB64url(firma), enc.encode(vence));
  } catch {
    return false;
  }
}

// ---------- Utilidades ----------

async function leerJson(request) {
  const largo = Number(request.headers.get("content-length") || 0);
  if (largo > 64 * 1024) throw new ErrorDeDatos("Pedido demasiado grande.");
  try {
    return await request.json();
  } catch {
    throw new ErrorDeDatos("Datos inválidos.");
  }
}

function corsPublico() {
  return { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
