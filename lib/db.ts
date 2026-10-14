import { neon } from "@neondatabase/serverless";
import { readDemoSession } from "@/lib/demo/session";
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  const sql = neon(process.env.DATABASE_URL);
  return async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const session = await readDemoSession();
    const query = sql(strings, ...values);
    if (!session) return await query;
    // The schema is fixed server-side and has no public fallback. SET LOCAL is
    // scoped to this transaction, including pooled and concurrent requests.
    const results = await sql.transaction([
      sql`SELECT set_config('search_path','tafari_demo,pg_catalog',true)`,
      query,
    ]);
    return results[1];
  };
}
