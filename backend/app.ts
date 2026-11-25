import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.ts';
import userRoutes from './routes/userRoutes.ts';
import courseRoutes from './routes/courseRoutes.ts';
import lessonRoutes from './routes/lessonRoutes.ts';
import quizRoutes from './routes/quizRoutes.ts';
import assignmentRoutes from './routes/assignmentRoutes.ts';
import analyticsRoutes from './routes/analyticsRoutes.ts';
import tutorRoutes from './routes/tutorRoutes.ts';
import communityRoutes from './routes/communityRoutes.ts';

export function createApiApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'http://localhost:3000'] : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'LinguaLearn API' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/lessons', lessonRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/tutor', tutorRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api', analyticsRoutes);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ message: 'API endpoint not found.' });
  });

  return app;
}
