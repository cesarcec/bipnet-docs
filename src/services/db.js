import mysql from 'mysql2/promise';

let pool;

export async function createPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'documento_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
  });
  return pool;
}

export function getPool() {
  if (!pool) throw new Error('DB pool not initialized, call createPool() first');
  return pool;
}


