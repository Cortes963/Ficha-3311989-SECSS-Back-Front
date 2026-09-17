-- SECSS: cambios requeridos por la propuesta aprobada.
-- Ejecutar sobre la base SECSS existente en orden.

ALTER TABLE detalle_aprendiz
  MODIFY ficha VARCHAR(50) NOT NULL;

ALTER TABLE cuenta
  ADD COLUMN expira_en DATETIME NULL;

CREATE TABLE IF NOT EXISTS archivo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_original VARCHAR(255) NOT NULL,
  nombre_almacenado VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  tamano INT NOT NULL,
  ruta VARCHAR(500) NOT NULL,
  id_usuario_subida INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_archivo_usuario FOREIGN KEY (id_usuario_subida)
    REFERENCES usuario(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS password_reset_token (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expira_en DATETIME NOT NULL,
  usado_en DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario(id) ON DELETE RESTRICT,
  INDEX idx_password_reset_usuario (id_usuario),
  INDEX idx_password_reset_expiracion (expira_en)
);
