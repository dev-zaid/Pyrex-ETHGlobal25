import { Pool } from 'pg';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

const connectionString = getEnv('DATABASE_URL');

logger.info({ connectionString: connectionString.replace(/:[^:@/]+@/, ':***@') }, '[db] initializing connection pool');

export const pool = new Pool({ connectionString });

process.on('exit', () => {
  void pool.end();
});
