import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_UNPOOLED)
  throw new Error("Direct database connection is required");
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
for (const file of (await readdir("migrations"))
  .filter((f) => /^\d+_.+\.sql$/.test(f))
  .sort()) {
  const statements = (await readFile("migrations/" + file, "utf8"))
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && s !== "BEGIN" && s !== "COMMIT");
  await sql.transaction([
    sql`SELECT set_config('search_path','public,pg_catalog',true)`,
    ...statements.map((s) => sql.query(s)),
  ]);
  console.log("Applied", file);
}
