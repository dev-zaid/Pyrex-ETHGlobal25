const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://pyrex:pyrex_pass@localhost:5432/pyrex_db';

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });

try {
  const normalized = connectionString.replace(/^(postgres(ql)?):\/\//, 'http://');
  const parsed = new URL(normalized);
  console.log(
    '[db] connecting',
    {
      host: parsed.hostname,
      port: parsed.port || '5432',
      database: parsed.pathname.replace('/', ''),
      user: parsed.username,
    }
  );
} catch (err) {
  console.warn('[db] failed to parse connection string', err);
}

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
});

const query = (text, params) => pool.query(text, params);

const getClient = async () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
};
