-- Las fotos subidas desde el panel se guardan en la base (R2 pide tarjeta para activarse).
-- El panel las achica antes de subirlas (unos 150 KB); el servidor acepta hasta 1,5 MB por foto.
CREATE TABLE fotos (
  clave  TEXT PRIMARY KEY,   -- <uuid>.jpg | .webp | .png
  tipo   TEXT NOT NULL,      -- image/jpeg, image/webp, image/png
  datos  BLOB NOT NULL,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
