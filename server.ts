import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { connectDatabase } from './backend/config/db.ts';
import { initializeStore } from './backend/services/store.ts';
import { createApiApp } from './backend/app.ts';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await connectDatabase();
  await initializeStore();

  const app = createApiApp();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LinguaLearn] Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[LinguaLearn] Failed to start server:', err);
  process.exit(1);
});
