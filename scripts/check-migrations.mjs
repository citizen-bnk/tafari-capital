import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
const schema = "tafari_migration_check_" + randomUUID().replaceAll("-", "");
await sql.query("CREATE SCHEMA " + schema);
try {
  for (const file of (await readdir("migrations"))
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort()) {
    const statements = (await readFile("migrations/" + file, "utf8"))
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && s !== "BEGIN" && s !== "COMMIT");
    await sql.transaction([
      sql`SELECT set_config('search_path',${schema + ",pg_catalog"},true)`,
      ...statements.map((s) => sql.query(s)),
    ]);
  }
  console.log("All migrations validated in a fresh isolated schema.");
} finally {
  // This internally generated schema was created by this invocation only.
  await sql.query("DROP SCHEMA " + schema + " CASCADE");
}
