// One-time (re-runnable) porter: transforms each Base44 edge function in
// base44/functions/<name>/entry.ts into a Supabase edge function at
// supabase/functions/<name>/index.ts.
//
//   node scripts/port-functions.mjs
//
// The transform is deliberately mechanical so the ported functions stay a
// faithful copy of the originals:
//   1. Swap the `@base44/sdk` import for the local compat shim + CORS helper.
//   2. Wrap the Deno.serve handler with withCors(...) for browser CORS.
//   3. Replace the hardcoded base44.app fallback URL with APP_BASE_URL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'base44', 'functions');
const OUT_DIR = path.join(ROOT, 'supabase', 'functions');

const BASE44_IMPORT_RE =
  /import\s*\{\s*createClientFromRequest\s*\}\s*from\s*['"]npm:@base44\/sdk@[^'"]*['"];?/;

const COMPAT_IMPORTS =
  `import { createClientFromRequest } from '../_shared/base44-compat.ts';\n` +
  `import { withCors } from '../_shared/cors.ts';`;

// Replace the first column-0 `});` (which closes the Deno.serve handler) with
// `}));` to close the withCors(...) wrapper we add around it.
function closeWithCors(code) {
  const lines = code.split('\n');
  const serveIdx = lines.findIndex((l) => l.includes('Deno.serve('));
  if (serveIdx === -1) return code;
  for (let i = serveIdx + 1; i < lines.length; i++) {
    // Column-0 `});` closes the Deno.serve handler (indented `});` are nested
    // calls). Strip a trailing CR so CRLF files match too.
    const bare = lines[i].replace(/\r$/, '');
    if (bare === '});') {
      lines[i] = lines[i].replace('});', '}));');
      return lines.join('\n');
    }
  }
  throw new Error('Could not find the Deno.serve closing "});" at column 0.');
}

function port(name) {
  const srcFile = path.join(SRC_DIR, name, 'entry.ts');
  let code = fs.readFileSync(srcFile, 'utf8');

  if (!BASE44_IMPORT_RE.test(code)) {
    throw new Error(`${name}: expected @base44/sdk import not found.`);
  }
  code = code.replace(BASE44_IMPORT_RE, COMPAT_IMPORTS);

  // Wrap the handler: Deno.serve(async (req) => {  ->  Deno.serve(withCors(async (req) => {
  code = code.replace(/Deno\.serve\(\s*(async\s*\(\s*_?req[^)]*\)\s*=>\s*\{)/, 'Deno.serve(withCors($1');
  code = closeWithCors(code);

  // Point the checkout redirect fallback at the self-hosted app domain.
  code = code.replaceAll('"https://app.base44.app"', 'Deno.env.get("APP_BASE_URL") || "https://app.base44.app"');

  const outSub = path.join(OUT_DIR, name);
  fs.mkdirSync(outSub, { recursive: true });
  fs.writeFileSync(path.join(outSub, 'index.ts'), code);
  return name;
}

const names = fs
  .readdirSync(SRC_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let count = 0;
for (const name of names) {
  port(name);
  count++;
}
console.log(`Ported ${count} edge functions to supabase/functions/*/index.ts`);
