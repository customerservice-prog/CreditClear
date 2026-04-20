/**
 * Deletes all credit report snapshots and uploaded report files for one user.
 *
 * Removes:
 * - public.credit_reports (cascades tradelines, report_inquiries, report_public_records)
 * - public.uploads rows
 * - storage objects under private-uploads/{userId}/...
 *
 * Does NOT delete disputes, letters, or subscriptions.
 *
 * Required env:
 *   DATABASE_URL          — Postgres URI (Supabase → Database → URI)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Target (one of):
 *   TARGET_EMAIL          — preferred
 *   ADMIN_EMAIL           — used if TARGET_EMAIL unset (main ops account)
 *
 * Safety:
 *   CONFIRM=DELETE_USER_REPORTS
 *
 * Optional:
 *   DRY_RUN=1             — print counts only, no deletes
 *
 *   node scripts/wipe-user-reports.mjs
 *   # or
 *   TARGET_EMAIL=you@example.com CONFIRM=DELETE_USER_REPORTS node scripts/wipe-user-reports.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadDotEnv() {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) {
    return
  }
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) {
      continue
    }
    const i = t.indexOf('=')
    if (i === -1) {
      continue
    }
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) {
      process.env[k] = v
    }
  }
}

loadDotEnv()

const DATABASE_URL = process.env.DATABASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TARGET_EMAIL = (process.env.TARGET_EMAIL || process.env.ADMIN_EMAIL || '').trim()
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const CONFIRM = process.env.CONFIRM

const BUCKET = 'private-uploads'

function die(msg) {
  console.error(msg)
  process.exit(1)
}

if (CONFIRM !== 'DELETE_USER_REPORTS') {
  die('Refusing to run: set CONFIRM=DELETE_USER_REPORTS (use DRY_RUN=1 to preview only).')
}
if (!DATABASE_URL) {
  die('Missing DATABASE_URL.')
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  die('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
}
if (!TARGET_EMAIL) {
  die('Missing TARGET_EMAIL or ADMIN_EMAIL.')
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
})

await client.connect()

let userId
try {
  const r = await client.query('select id from auth.users where lower(email) = lower($1) limit 2', [
    TARGET_EMAIL,
  ])
  if (r.rowCount === 0) {
    die(`No auth.users row for email: ${TARGET_EMAIL}`)
  }
  if (r.rowCount > 1) {
    die(`Multiple auth.users rows for email: ${TARGET_EMAIL} — resolve manually.`)
  }
  userId = r.rows[0].id
  console.log('Target user:', userId, TARGET_EMAIL)
} catch (e) {
  die(`Postgres error: ${e instanceof Error ? e.message : e}`)
}

const counts = await client.query(
  `select
    (select count(*)::int from public.credit_reports where user_id = $1) as credit_reports,
    (select count(*)::int from public.uploads where user_id = $1) as uploads`,
  [userId],
)
const { credit_reports: reportCount, uploads: uploadCount } = counts.rows[0]
console.log('Rows:', { credit_reports: reportCount, uploads: uploadCount })

const pathsRes = await client.query(
  'select file_path from public.uploads where user_id = $1',
  [userId],
)
const dbPaths = pathsRes.rows.map((row) => row.file_path).filter(Boolean)

if (DRY_RUN) {
  console.log('DRY_RUN: would remove', dbPaths.length, 'paths from DB list + folder sweep')
  console.log('Sample paths:', dbPaths.slice(0, 5))
  await client.end()
  process.exit(0)
}

/** Remove every object in private-uploads/{userId}/ (paginated). */
async function emptyUserStorageFolder(uid) {
  let offset = 0
  const limit = 500
  for (;;) {
    const { data: files, error } = await supabase.storage.from(BUCKET).list(uid, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) {
      throw new Error(`storage.list: ${error.message}`)
    }
    if (!files?.length) {
      break
    }
    const paths = files.filter((f) => f.name).map((f) => `${uid}/${f.name}`)
    if (paths.length) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths)
      if (rmErr) {
        throw new Error(`storage.remove: ${rmErr.message}`)
      }
      console.log('Removed storage objects:', paths.length)
    }
    if (files.length < limit) {
      break
    }
    offset += limit
  }
}

try {
  await emptyUserStorageFolder(userId)
} catch (e) {
  console.warn('Storage sweep warning (continuing with SQL deletes):', e instanceof Error ? e.message : e)
}

const chunk = 100
for (let i = 0; i < dbPaths.length; i += chunk) {
  const slice = dbPaths.slice(i, i + chunk)
  const { error: rmErr } = await supabase.storage.from(BUCKET).remove(slice)
  if (rmErr) {
    console.warn('storage.remove(db paths):', rmErr.message)
  }
}

const delReports = await client.query('delete from public.credit_reports where user_id = $1', [userId])
const delUploads = await client.query('delete from public.uploads where user_id = $1', [userId])

console.log('Deleted credit_reports rows:', delReports.rowCount)
console.log('Deleted uploads rows:', delUploads.rowCount)

await client.end()
console.log('Done.')
