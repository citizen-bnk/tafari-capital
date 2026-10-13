import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_UNPOOLED)
  throw new Error("Direct database connection is required");
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
const statements = (await readFile("migrations/001_platform.sql", "utf8"))
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s && s !== "BEGIN" && s !== "COMMIT");
await sql.transaction(statements.map((s) => sql.query(s)));
console.log("Platform migration 001 applied");
