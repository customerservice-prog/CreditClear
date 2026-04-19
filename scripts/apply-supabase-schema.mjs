/**
 * Applies all SQL files in `supabase/migrations/` in filename order.
 *
 * Requires DATABASE_URL — the Postgres connection URI from Supabase (Settings → Database),
 * NOT the anon or service_role JWT. Use "Direct connection" or "Session pooler" URI with
 * the database password.
 *
 *   DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres" npm run db:apply
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error(
    'Missing DATABASE_URL. In Supabase: Project Settings → Database → Connection string (URI).\n' +
      'Example: DATABASE_URL="postgresql://postgres.[ref]:YOUR_DB_PASSWORD@db.awpmraducedwbabeunxl.supabase.co:5432/postgres" npm run db:apply\n' +
      'Alternatively, run each file in supabase/migrations/ in order via the Supabase SQL Editor.',
  )
  process.exit(1)
}

const migrationsDir = path.join(root, 'supabase/migrations')
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

if (migrationFiles.length === 0) {
  console.error('No .sql files found in', migrationsDir)
  process.exit(1)
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
})

await client.connect()
try {
  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(migrationPath, 'utf8')
    await client.query(sql)
    console.log('Migration applied:', migrationPath)
  }
} finally {
  await client.end()
}
