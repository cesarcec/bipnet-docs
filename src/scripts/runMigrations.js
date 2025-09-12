import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createPool, getPool } from '../services/db.js';

async function run() {
  await createPool();
  const pool = getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destinatario VARCHAR(255) NOT NULL,
    origen VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    lugar VARCHAR(255) NOT NULL,
    motivo TEXT NULL,
    user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_origen (origen),
    INDEX idx_lugar (lugar),
    INDEX idx_fecha (fecha)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  await pool.query(`CREATE TABLE IF NOT EXISTS document_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  // seed default user if not exists
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', ['admin']);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('Usuario admin creado con contraseña por defecto.');
  } else {
    console.log('Usuario admin ya existe.');
  }
  console.log('Migraciones ejecutadas.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


