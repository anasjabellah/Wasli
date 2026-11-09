import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to create the application role');
}

const password = process.env.APP_DB_PASSWORD ?? 'wasli_app';
const client = new pg.Client({ connectionString });
await client.connect();

try {
  const existing = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = 'wasli_app'`);
  if (existing.rowCount === 0) {
    const statement = await client.query<{ stmt: string }>(
      `SELECT format(
         'CREATE ROLE wasli_app LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE',
         $1::text
       ) AS stmt`,
      [password],
    );
    await client.query(statement.rows[0]?.stmt ?? '');
  }

  const database = await client.query<{ name: string }>('SELECT current_database() AS name');
  const name = database.rows[0]?.name;
  if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Unexpected database name: ${name ?? ''}`);
  }

  await client.query(`GRANT CONNECT ON DATABASE "${name}" TO wasli_app`);
  await client.query('GRANT USAGE ON SCHEMA public TO wasli_app');
} finally {
  await client.end();
}
