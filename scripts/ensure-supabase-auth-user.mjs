/**
 * Ensures ADMIN_EMAIL exists in Supabase Auth with ADMIN_PASSWORD (email confirmed).
 * Railway ADMIN_* vars are not wired to the login form — this syncs them to Supabase.
 *
 * Usage (local):  set env from Railway or .env, then:
 *   npm run auth:sync-admin
 *
 * Usage (Railway): railway run npm run auth:sync-admin
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const email = process.env.ADMIN_EMAIL?.trim()
const password = process.env.ADMIN_PASSWORD?.trim()

if (!url || !serviceKey || !email || !password) {
  console.error(
    'Missing env. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD',
  )
  process.exit(1)
}

if (password.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters (Supabase policy).')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const emailLower = email.toLowerCase()

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Admin' },
})

if (!createErr && created?.user) {
  console.log(`Created Supabase Auth user: ${email}`)
  process.exit(0)
}

const exists =
  createErr &&
  /already|registered|exists|duplicate/i.test(createErr.message || '')

if (!exists) {
  console.error('createUser failed:', createErr?.message || createErr)
  process.exit(1)
}

let found = null
for (let page = 1; page <= 50; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) {
    console.error('listUsers:', error.message)
    process.exit(1)
  }
  if (!data?.users?.length) {
    break
  }
  found = data.users.find((u) => u.email?.toLowerCase() === emailLower)
  if (found) {
    break
  }
}

if (!found) {
  console.error(`User ${email} not found and createUser failed:`, createErr?.message)
  process.exit(1)
}

const { error: updErr } = await admin.auth.admin.updateUserById(found.id, {
  password,
  email_confirm: true,
})

if (updErr) {
  console.error('updateUserById:', updErr.message)
  process.exit(1)
}

console.log(`Updated password and confirmed email for: ${email}`)
console.log('You can sign in at /login with that email and ADMIN_PASSWORD.')
