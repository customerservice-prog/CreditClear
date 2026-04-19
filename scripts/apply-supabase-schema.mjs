/**
 * Applies supabase/migrations/20260419000000_initial_schema.sql to Postgres.
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
      'Alternatively, open supabase/migrations/20260419000000_initial_schema.sql in the Supabase SQL Editor and run it.',
  )
  process.exit(1)
}

const migrationPath = path.join(root, 'supabase/migrations/20260419000000_initial_schema.sql')
const sql = fs.readFileSync(migrationPath, 'utf8')

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
})

await client.connect()
try {
  await client.query(sql)
  console.log('Migration applied:', migrationPath)
} finally {
  await client.end()
}
