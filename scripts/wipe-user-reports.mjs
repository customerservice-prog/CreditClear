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
 *   SUPABASE_URL                    — or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   DATABASE_URL                    — if set, resolves user via auth.users + uses SQL for counts/deletes
 *   If omitted, resolves user via public.profiles (email ilike, case-insensitive).
 *
 * Target:
 *   TARGET_EMAIL or ADMIN_EMAIL
 *
 * Safety:
 *   CONFIRM=DELETE_USER_REPORTS
 *
 * Preview (no deletes) — pass flag only; ignores stray DRY_RUN in parent shell:
 *   node scripts/wipe-user-reports.mjs --dry-run
 */

import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { loadRepoDotEnv } from './load-repo-dotenv.mjs'

loadRepoDotEnv()

const DATABASE_URL = process.env.DATABASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TARGET_EMAIL = (process.env.TARGET_EMAIL || process.env.ADMIN_EMAIL || '').trim()
const dryRun = process.argv.includes('--dry-run')
const CONFIRM = process.env.CONFIRM

const BUCKET = 'private-uploads'

function die(msg) {
  console.error(msg)
  process.exit(1)
}

/** Remove every object in private-uploads/{userId}/ (paginated). */
async function emptyUserStorageFolder(supabase, uid) {
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

async function removeDbPaths(supabase, dbPaths) {
  const chunk = 100
  for (let i = 0; i < dbPaths.length; i += chunk) {
    const slice = dbPaths.slice(i, i + chunk)
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove(slice)
    if (rmErr) {
      console.warn('storage.remove(db paths):', rmErr.message)
    }
  }
}

async function main() {
  if (CONFIRM !== 'DELETE_USER_REPORTS') {
    die('Refusing to run: set CONFIRM=DELETE_USER_REPORTS (preview: add --dry-run to the command).')
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    die('Missing SUPABASE_URL (or VITE_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.')
  }
  if (!TARGET_EMAIL) {
    die('Missing TARGET_EMAIL or ADMIN_EMAIL.')
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let userId
  let reportCount = 0
  let uploadCount = 0
  let dbPaths = []

  if (DATABASE_URL) {
    const client = new pg.Client({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    })
    await client.connect()
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

      const counts = await client.query(
        `select
          (select count(*)::int from public.credit_reports where user_id = $1) as credit_reports,
          (select count(*)::int from public.uploads where user_id = $1) as uploads`,
        [userId],
      )
      reportCount = counts.rows[0].credit_reports
      uploadCount = counts.rows[0].uploads

      const pathsRes = await client.query('select file_path from public.uploads where user_id = $1', [userId])
      dbPaths = pathsRes.rows.map((row) => row.file_path).filter(Boolean)

      console.log('Rows:', { credit_reports: reportCount, uploads: uploadCount })

      if (dryRun) {
        console.log('--dry-run: would remove', dbPaths.length, 'paths from DB list + folder sweep')
        console.log('Sample paths:', dbPaths.slice(0, 5))
        return
      }

      try {
        await emptyUserStorageFolder(supabase, userId)
      } catch (e) {
        console.warn('Storage sweep warning (continuing):', e instanceof Error ? e.message : e)
      }

      await removeDbPaths(supabase, dbPaths)

      const delReports = await client.query('delete from public.credit_reports where user_id = $1', [userId])
      const delUploads = await client.query('delete from public.uploads where user_id = $1', [userId])
      console.log('Deleted credit_reports rows:', delReports.rowCount)
      console.log('Deleted uploads rows:', delUploads.rowCount)
    } finally {
      await client.end()
    }
  } else {
    const esc = TARGET_EMAIL.replace(/[%_]/g, '')
    const { data: profs, error: pe } = await supabase.from('profiles').select('id,email').ilike('email', esc).limit(3)

    if (pe) {
      die(`profiles lookup: ${pe.message}`)
    }
    if (!profs?.length) {
      die(
        `No public.profiles row for email (ilike): ${TARGET_EMAIL}. Add DATABASE_URL to use auth.users, or fix profile email.`,
      )
    }
    if (profs.length > 1) {
      die(`Multiple profile matches for ${TARGET_EMAIL} — use DATABASE_URL or narrow TARGET_EMAIL.`)
    }
    userId = profs[0].id
    console.log('Target user:', userId, profs[0].email)

    const { count: rc, error: re1 } = await supabase
      .from('credit_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (re1) {
      die(`credit_reports count: ${re1.message}`)
    }
    reportCount = rc ?? 0

    const { count: uc, error: re2 } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (re2) {
      die(`uploads count: ${re2.message}`)
    }
    uploadCount = uc ?? 0

    const { data: upRows, error: re3 } = await supabase.from('uploads').select('file_path').eq('user_id', userId)
    if (re3) {
      die(`uploads paths: ${re3.message}`)
    }
    dbPaths = (upRows ?? []).map((row) => row.file_path).filter(Boolean)

    console.log('Rows:', { credit_reports: reportCount, uploads: uploadCount })

    if (dryRun) {
      console.log('--dry-run: would remove', dbPaths.length, 'paths from DB list + folder sweep')
      console.log('Sample paths:', dbPaths.slice(0, 5))
      return
    }

    try {
      await emptyUserStorageFolder(supabase, userId)
    } catch (e) {
      console.warn('Storage sweep warning (continuing):', e instanceof Error ? e.message : e)
    }

    await removeDbPaths(supabase, dbPaths)

    const { error: de1 } = await supabase.from('credit_reports').delete().eq('user_id', userId)
    if (de1) {
      die(`delete credit_reports: ${de1.message}`)
    }
    const { error: de2 } = await supabase.from('uploads').delete().eq('user_id', userId)
    if (de2) {
      die(`delete uploads: ${de2.message}`)
    }
    console.log('Deleted credit_reports and uploads for user_id', userId)
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
