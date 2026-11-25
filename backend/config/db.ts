import mongoose from 'mongoose';
import { Pool } from 'pg';
import { ensurePostgresSchema } from '../services/postgres.ts';

let mongoConnected = false;
let postgresConnected = false;
let pgPool: Pool | null = null;

function resolveNeonConnectionString(): string | null {
  const candidates = [
    process.env.NEON_DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (
      !trimmed ||
      trimmed.includes('<user>') ||
      trimmed.includes('<username>') ||
      trimmed.includes('<password>') ||
      trimmed.includes('<endpoint>')
    ) {
      continue;
    }
    if (trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://')) {
      return trimmed;
    }
  }
  return null;
}

export async function connectDatabase(): Promise<{
  mode: 'neon-postgres' | 'mongodb' | 'local-store';
}> {
  const neonUri = resolveNeonConnectionString();
  if (neonUri) {
    try {
      const disableSsl = neonUri.includes('sslmode=disable');
      const pool = new Pool({
        connectionString: neonUri,
        ssl: disableSsl ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      });
      pool.on('error', (err) => {
        console.error('[LinguaLearn] Unexpected PostgreSQL pool error:', err);
      });
      await pool.query('SELECT 1');
      await ensurePostgresSchema(pool);
      pgPool = pool;
      postgresConnected = true;
      console.log('[LinguaLearn] Connected to Neon PostgreSQL database');
      return { mode: 'neon-postgres' };
    } catch (err) {
      console.warn(
        '[LinguaLearn] Neon PostgreSQL connection unavailable, checking fallback storage:',
        (err as Error).message
      );
      postgresConnected = false;
      pgPool = null;
    }
  }

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>') || uri.trim() === '') {
    mongoConnected = false;
    return { mode: 'local-store' };
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    mongoConnected = true;
    console.log('[LinguaLearn] Connected to MongoDB Atlas via Mongoose');
    return { mode: 'mongodb' };
  } catch (err) {
    console.warn(
      '[LinguaLearn] MongoDB connection unavailable, using persistent local document store:',
      (err as Error).message
    );
    mongoConnected = false;
    return { mode: 'local-store' };
  }
}

export function isPostgresConnected(): boolean {
  return postgresConnected && pgPool !== null;
}

export function getPostgresPool(): Pool | null {
  return pgPool;
}

export function isMongoConnected(): boolean {
  return mongoConnected && mongoose.connection.readyState === 1;
}
