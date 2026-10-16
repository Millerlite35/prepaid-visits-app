// Keeps the free Supabase project from pausing for inactivity (it pauses after ~7 days
// without database activity). Runs a few small READ-ONLY queries and appends one line to
// keep-awake.log in the project folder. Changes nothing in the database.
//
// Run by hand:  node scripts/keep-supabase-awake.mjs
// Scheduled weekly by Windows Task Scheduler (task "Keep Supabase awake"). Not needed once
// the project is on a paid Supabase plan, which never pauses.
import { appendFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logFile = path.join(projectDir, "keep-awake.log");
const log = (line) => appendFileSync(logFile, `${new Date().toISOString()}  ${line}\n`);

try {
  process.loadEnvFile(path.join(projectDir, ".env.local"));
  const require = createRequire(path.join(projectDir, "package.json"));
  const { createClient } = require("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });

  const counts = [];
  for (const table of ["providers", "package_templates", "visit_ledger"]) {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    counts.push(`${table}=${count}`);
  }
  log(`ok  ${counts.join("  ")}`);
  console.log("Supabase is awake:", counts.join(", "));
} catch (e) {
  log(`FAILED  ${e instanceof Error ? e.message : e}`);
  console.error("Keep-awake check failed:", e);
  process.exitCode = 1;
}
