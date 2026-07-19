// Seed sample communities under an HOA admin account (default admin@naborhoa.com).
//
//   node scripts/seed.mjs
//
// Uses the Supabase service-role key, so it bypasses RLS. It is idempotent: the
// organization and communities use fixed ids, so re-running updates the same
// rows instead of creating duplicates.
//
// Required env (in .env.local or .env.migrate, or the real environment):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional env:
//   SEED_ADMIN_EMAIL     (default admin@naborhoa.com)
//   SEED_ADMIN_PASSWORD  (only applied when the admin account is created fresh)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Minimal .env loader (does not override already-set process.env values).
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnvFile(path.join(ROOT, '.env.migrate'));
loadEnvFile(path.join(ROOT, '.env.local'));

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Add them to .env.local. The service-role key is in the Supabase');
  console.error('Dashboard -> Project Settings -> API -> "service_role" secret.');
  process.exit(1);
}

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@naborhoa.com').trim();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || null;
const ADMIN_NAME = 'Nabor Admin';
const ORG_ID = 'seed-org-nabor-hoa';

const COMMUNITIES = [
  { id: 'seed-comm-maple-grove', name: 'Maple Grove HOA', city: 'Austin', state: 'TX', zip: '78701', join_code: 'MAPLE1', monthly_dues: 150, plan_id: 'growth', description: 'A 220-home community with parks, a pool, and a clubhouse.' },
  { id: 'seed-comm-sunset-ridge', name: 'Sunset Ridge Community', city: 'Phoenix', state: 'AZ', zip: '85001', join_code: 'SUNSET', monthly_dues: 95, plan_id: 'starter', description: 'Desert-view townhomes with shared landscaping.' },
  { id: 'seed-comm-harbor-point', name: 'Harbor Point Association', city: 'Seattle', state: 'WA', zip: '98101', join_code: 'HARBOR', monthly_dues: 220, plan_id: 'pro', description: 'Waterfront condos with marina access and on-site management.' },
  { id: 'seed-comm-willow-creek', name: 'Willow Creek Estates', city: 'Denver', state: 'CO', zip: '80202', join_code: 'WILLOW', monthly_dues: 175, plan_id: 'growth', description: 'Single-family homes with trails and a community garden.' },
];

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const found = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function ensureAdminUser() {
  const existing = await findAuthUserByEmail(ADMIN_EMAIL);
  if (existing) {
    // Apply SEED_ADMIN_PASSWORD to the existing account too, so it stays a
    // usable login even when email-based password recovery isn't set up.
    if (ADMIN_PASSWORD) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (error) throw new Error(`updateUserById: ${error.message}`);
      console.log(`- Reusing existing auth user ${ADMIN_EMAIL} (password set from SEED_ADMIN_PASSWORD)`);
    } else {
      console.log(`- Reusing existing auth user ${ADMIN_EMAIL}`);
    }
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD || undefined,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_NAME },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  console.log(
    `- Created auth user ${ADMIN_EMAIL}` +
      (ADMIN_PASSWORD ? ' (password set from SEED_ADMIN_PASSWORD)' : ' (no password yet — use "Forgot password" to set one)'),
  );
  return data.user.id;
}

async function main() {
  const adminId = await ensureAdminUser();

  // Organization (fixed id so re-runs update in place).
  const { error: orgErr } = await admin.from('organization').upsert(
    {
      id: ORG_ID,
      name: 'Nabor HOA Demo',
      type: 'management_company',
      description: 'Sample organization seeded for demos.',
      created_by_id: adminId,
      created_by: ADMIN_EMAIL,
    },
    { onConflict: 'id' },
  );
  if (orgErr) throw new Error(`organization upsert: ${orgErr.message}`);
  console.log(`- Organization "${ORG_ID}" ready`);

  // Link the admin's profile to the org. The signup trigger only sets
  // id/email/full_name, so role + organization_id must be set here. Preserve an
  // existing community_id if the admin already has one.
  const { data: prof } = await admin.from('profiles').select('community_id').eq('id', adminId).maybeSingle();
  const profilePatch = {
    id: adminId,
    role: 'hoa_admin',
    organization_id: ORG_ID,
    email: ADMIN_EMAIL,
    full_name: ADMIN_NAME,
    community_id: prof?.community_id || COMMUNITIES[0].id,
  };
  const { error: profErr } = await admin.from('profiles').upsert(profilePatch, { onConflict: 'id' });
  if (profErr) throw new Error(`profiles upsert: ${profErr.message}`);
  console.log(`- Admin profile linked (role hoa_admin, org ${ORG_ID})`);

  // Communities (fixed ids -> idempotent upsert).
  const rows = COMMUNITIES.map((c) => ({
    ...c,
    organization_id: ORG_ID,
    billing_cycle: 'monthly',
    subscription_status: 'active',
    created_by_id: adminId,
    created_by: ADMIN_EMAIL,
  }));
  const { error: commErr } = await admin.from('community').upsert(rows, { onConflict: 'id' });
  if (commErr) throw new Error(`community upsert: ${commErr.message}`);
  console.log(`- Seeded ${rows.length} communities:`);
  for (const c of rows) console.log(`    * ${c.name} (${c.city}, ${c.state}) — join code ${c.join_code}`);

  console.log(`\nDone. Log in as ${ADMIN_EMAIL} to see the seeded communities.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
