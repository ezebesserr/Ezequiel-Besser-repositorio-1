-- Catálogo de MAICO. Las prendas arrancan con las publicaciones de Instagram de noviembre de 2026:
-- sin precio ni talles (no figuran en las publicaciones). Los carga el dueño desde el panel.

CREATE TABLE prendas (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  categoria   TEXT NOT NULL,
  precio      INTEGER,                 -- en pesos; NULL = "consultá precio"
  foto        TEXT NOT NULL DEFAULT '',-- 'img/...' (viene con la web) o 'foto:<clave>' (subida desde el panel)
  alt         TEXT NOT NULL DEFAULT '',
  ig          TEXT NOT NULL DEFAULT '',-- link a la publicación de Instagram (opcional)
  talles      TEXT NOT NULL DEFAULT '[]', -- JSON: [{"t":"M","stock":true}, ...]
  agotado     INTEGER NOT NULL DEFAULT 0,
  visible     INTEGER NOT NULL DEFAULT 1,
  destacada   INTEGER NOT NULL DEFAULT 0,
  orden       INTEGER NOT NULL DEFAULT 0,
  actualizado TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

INSERT INTO ajustes (clave, valor) VALUES
  ('whatsapp', ''),
  ('descuento_transferencia', '25'),
  ('cuotas', '3');

INSERT INTO prendas (id, nombre, categoria, foto, ig, alt, destacada, orden) VALUES
  ('remera-oversize-grafito', 'Remera oversize grafito', 'Remeras', 'img/remera-oversize-grafito.jpg', 'https://www.instagram.com/maico.storeoficial/reel/DfVscfZh9_J/', 'Chico con remera oversize gris grafito y pantalón negro, en el local de MAICO', 1, 1),
  ('campera-verde-militar', 'Campera verde militar', 'Camperas', 'img/campera-verde-militar.jpg', 'https://www.instagram.com/maico.storeoficial/p/DaQRXrrlgr9/', 'Campera verde militar con cierre, sobre remera blanca y pantalón verde', 0, 2),
  ('pantalon-pinzas-oliva', 'Pantalón de vestir con pinzas', 'Pantalones', 'img/pantalon-pinzas-oliva.jpg', 'https://www.instagram.com/maico.storeoficial/p/DdCG9E7IGSa/', 'Pantalón de vestir oliva con pinzas y mocasines negros', 0, 3),
  ('remera-lonely-minds-gris', 'Remera Lonely Minds gris', 'Remeras', 'img/remera-lonely-minds-gris.jpg', 'https://www.instagram.com/maico.storeoficial/p/DZVIFFDoCFF/', 'Remera gris con estampa Lonely Minds', 0, 4),
  ('sobrecamisa-pano-beige', 'Sobrecamisa de paño beige', 'Camperas', 'img/sobrecamisa-pano-beige.jpg', 'https://www.instagram.com/maico.storeoficial/p/DbMKiCroAyV/', 'Sobrecamisa de paño beige abierta sobre remera blanca estampada', 0, 5),
  ('pantalon-frisa-arena', 'Pantalón de frisa arena', 'Pantalones', 'img/pantalon-frisa-arena.jpg', 'https://www.instagram.com/maico.storeoficial/reel/DaidLRCBvSW/', 'Pantalón recto de frisa color arena con remera blanca y zapatillas blancas', 0, 6),
  ('remera-blanca-parche', 'Remera blanca con parche', 'Remeras', 'img/remera-blanca-parche.jpg', 'https://www.instagram.com/maico.storeoficial/p/Dcya8mpoPQt/', 'Remera blanca con parche en el pecho y pantalón negro', 0, 7),
  ('campera-negra-cierre', 'Campera negra con cierre', 'Camperas', 'img/campera-negra-cierre.jpg', 'https://www.instagram.com/maico.storeoficial/p/Dctfn85oC6y/', 'Campera negra corta con cierre y pantalón de vestir gris oscuro', 0, 8),
  ('buzo-capucha-azul-noche', 'Buzo con capucha azul noche', 'Buzos', 'img/buzo-capucha-azul-noche.jpg', 'https://www.instagram.com/maico.storeoficial/reel/DaleDLVg0Lt/', 'Buzo con capucha y jogger azul noche, en el local de MAICO', 0, 9),
  ('remera-lonely-minds-negra', 'Remera Lonely Minds negra lavada', 'Remeras', 'img/remera-lonely-minds-negra.jpg', 'https://www.instagram.com/maico.storeoficial/reel/DZQAq5_BSQi/', 'Remera negra lavada con estampa Lonely Minds', 0, 10),
  ('remera-lisa-topo', 'Remera lisa topo', 'Remeras', 'img/remera-lisa-topo.jpg', 'https://www.instagram.com/maico.storeoficial/p/DZKwJKlljRx/', 'Remera lisa color topo y pantalón negro', 0, 11);
