import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { createPool } from './services/db.js';
import authRouter from './routes/auth.js';
import docsRouter from './routes/documents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Static for uploaded files (src/uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Static for frontend (src/public)
app.use('/', express.static(path.join(__dirname, 'public')));

// Root explicit
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Routers
app.use('/api/auth', authRouter);
app.use('/api/documents', docsRouter);

const PORT = process.env.PORT || 3000;

async function start() {
  // initialize db pool early
  await createPool();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});


