import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { body, query, validationResult } from 'express-validator';
import { getPool } from '../services/db.js';
import { authMiddleware } from './auth.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsRoot);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const upload = multer({ storage });

// Create document with files
router.post(
  '/',
  authMiddleware,
  upload.array('files', 10),
  body('destinatario').isString().notEmpty(),
  body('origen').isString().notEmpty(),
  body('fecha').isISO8601().toDate(),
  body('lugar').isString().notEmpty(),
  body('motivo').isString().optional({ nullable: true }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { destinatario, origen, fecha, lugar, motivo } = req.body;
    const files = req.files || [];
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'INSERT INTO documents (destinatario, origen, fecha, lugar, motivo, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [destinatario, origen, fecha, lugar, motivo || null, req.user.sub]
      );
      const documentId = result.insertId;
      for (const f of files) {
        await conn.query(
          'INSERT INTO document_files (document_id, filename, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)',
          [documentId, f.filename, f.originalname, f.mimetype, f.size]
        );
      }
      await conn.commit();
      res.status(201).json({ id: documentId });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ message: 'Error al guardar el documento' });
    } finally {
      conn.release();
    }
  }
);

// List documents with filters
router.get(
  '/',
  authMiddleware,
  query('destinatario').optional().isString(),
  query('lugar').optional().isString(),
  query('desde').optional().isISO8601(),
  query('hasta').optional().isISO8601(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { destinatario, lugar, desde, hasta } = req.query;
    const pool = getPool();
    const filters = [];
    const params = [];
    if (destinatario) {
      filters.push('destinatario LIKE ?');
      params.push(`%${destinatario}%`);
    }
    if (lugar) {
      filters.push('lugar LIKE ?');
      params.push(`%${lugar}%`);
    }
    if (desde) {
      filters.push('fecha >= ?');
      params.push(desde);
    }
    if (hasta) {
      filters.push('fecha <= ?');
      params.push(hasta);
    }
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    try {
      const [rows] = await pool.query(
        `SELECT d.id, d.destinatario, d.origen, d.fecha, d.lugar, d.motivo,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', f.id, 'filename', f.filename, 'original_name', f.original_name))
                 FROM document_files f WHERE f.document_id = d.id) AS files
         FROM documents d ${where}
         ORDER BY d.fecha DESC, d.id DESC`,
        params
      );
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error al listar' });
    }
  }
);

// Update document
router.put(
  '/:id',
  authMiddleware,
  body('destinatario').isString().notEmpty(),
  body('origen').isString().notEmpty(),
  body('fecha').isISO8601().toDate(),
  body('lugar').isString().notEmpty(),
  body('motivo').isString().optional({ nullable: true }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    const { id } = req.params;
    const { destinatario, origen, fecha, lugar, motivo } = req.body;
    const pool = getPool();
    
    try {
      const [result] = await pool.query(
        'UPDATE documents SET destinatario = ?, origen = ?, fecha = ?, lugar = ?, motivo = ? WHERE id = ?',
        [destinatario, origen, fecha, lugar, motivo || null, id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Documento no encontrado' });
      }
      
      res.json({ message: 'Documento actualizado correctamente' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error al actualizar el documento' });
    }
  }
);

// Delete document
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // Get files to delete from filesystem
    const [files] = await conn.query('SELECT filename FROM document_files WHERE document_id = ?', [id]);
    
    // Delete from database (CASCADE will handle document_files)
    const [result] = await conn.query('DELETE FROM documents WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    // Delete files from filesystem
    for (const file of files) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(uploadsRoot, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.warn('Error deleting file:', fileErr.message);
      }
    }
    
    await conn.commit();
    res.json({ message: 'Documento eliminado correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar documento' });
  } finally {
    conn.release();
  }
});

export default router;


