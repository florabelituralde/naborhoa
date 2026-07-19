// One-time data migration: Base44 -> Supabase.
//
//   node scripts/migrate-data.mjs export   # Base44  -> ./migration-data/*.json
//   node scripts/migrate-data.mjs import   # ./migration-data/*.json -> Supabase
//   node scripts/migrate-data.mjs all      # export then import
//
// Why two phases: export dumps every entity to local JSON so you can inspect the
// data before writing it into Supabase; import is idempotent (safe to re-run).
//
// Required env (put them in .env.migrate or the real environment):
//   Export:  BASE44_APP_ID, BASE44_SERVICE_TOKEN   (Base44 service-role API key)
//            BASE44_SERVER_URL (optional, default https://base44.app)
//   Import:  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// The export phase needs the Base44 SDK, which is no longer a project dependency.
// Install it just for the migration:  npm install --no-save @base44/sdk
//
// Passwords cannot be exported from Base44 (they are hashed), so migrated users
// are created with confirmed emails but NO password. Tell your users to click
// "Forgot password" on first login to set one (or send them a reset link).
//
// Files stored in Base44 storage keep their original Base44 URLs in the data.
// Re-hosting those blobs in Supabase Storage is a separate, optional step
// (see README "Migrating uploaded files").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENTITIES_DIR = path.join(ROOT, 'base44', 'entities');
const DATA_DIR = path.join(ROOT, 'migration-data');
const USER_MAP_FILE = path.join(DATA_DIR, '_user-id-map.json');

// ---------------------------------------------------------------------------
// Minimal .env loader (does not override already-set process.env values).
// ---------------------------------------------------------------------------
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnvFile(path.join(ROOT, '.env.migrate'));
loadEnvFile(path.join(ROOT, '.env.local'));

// ---------------------------------------------------------------------------
// Entity definitions (mirrors scripts/generate-schema.mjs so table names and
// allowed columns stay in sync).
// ---------------------------------------------------------------------------
function parseJsonc(text) {
  const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const noLine = noBlock.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return JSON.parse(noLine);
}
function snake(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}
function tableFor(name) {
  return name === 'User' ? 'profiles' : snake(name);
}

const entityFiles = fs
  .readdirSync(ENTITIES_DIR)
  .filter((f) => f.endsWith('.jsonc') || f.endsWith('.json'));
const ENTITIES = entityFiles
  .map((f) => parseJsonc(fs.readFileSync(path.join(ENTITIES_DIR, f), 'utf8')))
  .sort((a, b) => a.name.localeCompare(b.name));

function allowedColumns(entity) {
  const cols = new Set([
    'id',
    'created_date',
    'updated_date',
    'created_by_id',
    'created_by',
    ...Object.keys(entity.properties || {}),
  ]);
  if (entity.name === 'User') {
    cols.add('base44_id');
    cols.add('email');
    cols.add('full_name');
  }
  return cols;
}

function pick(row, cols) {
  const out = {};
  for (const key of Object.keys(row || {})) {
    if (cols.has(key)) out[key] = row[key];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rewrite every Base44 user id (24-char hex) found anywhere in a value to the
// new Supabase uuid. Base44 ids are globally unique so entity ids/timestamps
// never collide with user ids, but we still preserve id/created_date/
// updated_date explicitly for safety.
// ---------------------------------------------------------------------------
function remapUserIds(value, userIdMap) {
  if (typeof value === 'string') return userIdMap[value] || value;
  if (Array.isArray(value)) return value.map((v) => remapUserIds(v, userIdMap));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = remapUserIds(v, userIdMap);
    return out;
  }
  return value;
}

function requireEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env var(s): ${missing.join(', ')}`);
    process.exit(1);
  }
}

// ===========================================================================
// EXPORT: Base44 -> ./migration-data/*.json
// ===========================================================================
async function loadBase44() {
  try {
    const mod = await import('@base44/sdk');
    return mod.createClient;
  } catch {
    console.error(
      'Could not load @base44/sdk. Install it just for the migration:\n' +
        '  npm install --no-save @base44/sdk',
    );
    process.exit(1);
  }
}

async function exportAll() {
  requireEnv(['BASE44_APP_ID', 'BASE44_SERVICE_TOKEN']);
  const createClient = await loadBase44();
  const base44 = createClient({
    appId: process.env.BASE44_APP_ID,
    serviceToken: process.env.BASE44_SERVICE_TOKEN,
    serverUrl: process.env.BASE44_SERVER_URL || 'https://base44.app',
  });

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const LIMIT = 100;
  for (const entity of ENTITIES) {
    const name = entity.name;
    const all = [];
    let skip = 0;
    for (;;) {
      let page;
      try {
        page = await base44.asServiceRole.entities[name].list('created_date', LIMIT, skip);
      } catch (err) {
        console.error(`  ! ${name}: export failed at skip=${skip}: ${err?.message || err}`);
        process.exit(1);
      }
      const arr = Array.isArray(page) ? page : page?.data ?? [];
      all.push(...arr);
      if (arr.length < LIMIT) break;
      skip += LIMIT;
    }
    fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(all, null, 2));
    console.log(`  exported ${String(all.length).padStart(6)}  ${name}`);
  }
  console.log(`Export complete -> ${path.relative(ROOT, DATA_DIR)}`);
}

// ===========================================================================
// IMPORT: ./migration-data/*.json -> Supabase
// ===========================================================================
function readEntityDump(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function listAllAuthUsers(admin) {
  const byEmail = {};
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) if (u.email) byEmail[u.email.toLowerCase()] = u.id;
    if (data.users.length < 1000) break;
    page += 1;
  }
  return byEmail;
}

async function importUsers(admin) {
  const users = readEntityDump('User');
  const userEntity = ENTITIES.find((e) => e.name === 'User');
  const cols = allowedColumns(userEntity);
  const existingByEmail = await listAllAuthUsers(admin);
  /** @type {Record<string,string>} base44 id -> supabase uuid */
  const userIdMap = {};

  // Pass 1: ensure an auth user exists for every Base44 user; build the id map.
  for (const u of users) {
    const email = (u.email || '').trim();
    if (!email) {
      console.warn(`  ! skipping user ${u.id}: no email`);
      continue;
    }
    let uuid = existingByEmail[email.toLowerCase()];
    if (!uuid) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: u.full_name || u.fullName || null, base44_id: u.id },
      });
      if (error) {
        console.error(`  ! createUser ${email}: ${error.message}`);
        continue;
      }
      uuid = data.user.id;
      existingByEmail[email.toLowerCase()] = uuid;
    }
    userIdMap[u.id] = uuid;
  }

  fs.writeFileSync(USER_MAP_FILE, JSON.stringify(userIdMap, null, 2));

  // Pass 2: fill each profile with the Base44 custom fields (the signup trigger
  // only set id/email/full_name), remapping any user references.
  let updated = 0;
  for (const u of users) {
    const uuid = userIdMap[u.id];
    if (!uuid) continue;
    const remapped = remapUserIds(u, userIdMap);
    const patch = pick(remapped, cols);
    delete patch.id; // never overwrite the profile PK
    patch.base44_id = u.id;
    patch.email = u.email;
    if (u.full_name || u.fullName) patch.full_name = u.full_name || u.fullName;
    const { error } = await admin.from('profiles').update(patch).eq('id', uuid);
    if (error) console.error(`  ! profiles update ${u.id}: ${error.message}`);
    else updated += 1;
  }
  console.log(`  users: ${Object.keys(userIdMap).length} mapped, ${updated} profiles filled`);
  return userIdMap;
}

async function upsertRows(admin, table, rows) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await admin.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`upsert ${table} [${i}..${i + chunk.length}]: ${error.message}`);
  }
}

async function importEntities(admin, userIdMap) {
  for (const entity of ENTITIES) {
    if (entity.name === 'User') continue;
    const table = tableFor(entity.name);
    const cols = allowedColumns(entity);
    const dump = readEntityDump(entity.name);
    if (!dump.length) {
      console.log(`  ${String(0).padStart(6)}  ${table} (no dump)`);
      continue;
    }
    const rows = dump.map((r) => {
      const remapped = remapUserIds(r, userIdMap);
      const row = pick(remapped, cols);
      row.id = r.id; // preserve original entity id + timestamps
      if (r.created_date) row.created_date = r.created_date;
      if (r.updated_date) row.updated_date = r.updated_date;
      return row;
    });
    try {
      await upsertRows(admin, table, rows);
      console.log(`  ${String(rows.length).padStart(6)}  ${table}`);
    } catch (err) {
      console.error(`  ! ${table}: ${err?.message || err}`);
      process.exit(1);
    }
  }
}

async function importAll() {
  requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`No migration-data/ found. Run "export" first.`);
    process.exit(1);
  }
  const admin = createSupabaseClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  console.log('Importing users...');
  const userIdMap = await importUsers(admin);
  console.log('Importing entities...');
  await importEntities(admin, userIdMap);
  console.log('Import complete.');
}

// ===========================================================================
const cmd = (process.argv[2] || 'all').toLowerCase();
if (cmd === 'export') {
  await exportAll();
} else if (cmd === 'import') {
  await importAll();
} else if (cmd === 'all') {
  await exportAll();
  await importAll();
} else {
  console.error(`Usage: node scripts/migrate-data.mjs [export|import|all]`);
  process.exit(1);
}
