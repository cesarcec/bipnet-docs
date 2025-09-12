import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { getPool } from '../services/db.js';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  body('username').isString().notEmpty(),
  body('password').isString().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
      if (rows.length === 0) return res.status(401).json({ message: 'Credenciales inválidas' });
      const user = rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

      const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET || 'dev_secret', {
        expiresIn: '7d',
      });
      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error de servidor' });
    }
  }
);

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No autorizado' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

export default router;


