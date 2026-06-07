-- Tabel user terpisah dari entitas akademik (mahasiswa/staff)
-- Sesuai notul Zoom: "ada database mahasiswa dan user"

CREATE TABLE IF NOT EXISTS user (
  id_user           INT AUTO_INCREMENT PRIMARY KEY,
  email             VARCHAR(150) NOT NULL,
  sandi_hash        VARCHAR(255) NULL,
  role              ENUM('mahasiswa','dosen','kaprodi','jamu','admin') NOT NULL,
  status            ENUM('pending_verification','aktif','nonaktif') NOT NULL DEFAULT 'pending_verification',
  token_verifikasi  VARCHAR(255) NULL,
  token_expires_at  DATETIME NULL,
  verified_at       DATETIME NULL,
  id_mahasiswa      INT NULL,
  id_staff          INT NULL,
  nama_input        VARCHAR(150) NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_email (email),
  KEY idx_user_token (token_verifikasi),
  KEY idx_user_role_status (role, status),

  CONSTRAINT fk_user_mahasiswa
    FOREIGN KEY (id_mahasiswa) REFERENCES mahasiswa(id_mahasiswa) ON DELETE SET NULL,
  CONSTRAINT fk_user_staff
    FOREIGN KEY (id_staff) REFERENCES staff(id_staff) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;