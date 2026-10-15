import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/access";
import { readDemoSession } from "@/lib/demo/session";
import type { AssetApplication } from "./questions";
import { currentActor } from "./service";
export async function intakeSession() {
  const name = (await readDemoSession())
    ? "tafari_demo_intake"
    : "tafari_intake";
  const token = (await cookies()).get(name)?.value;
  return {
    name,
    hash:
      token && /^[a-f0-9]{64}$/.test(token)
        ? createHash("sha256").update(token).digest("hex")
        : "",
  };
}
export async function intakeApplication() {
  const s = await intakeSession();
  if (!s.hash)
    throw new HttpError(404, "There is no saved application in this browser.");
  const [row] =
    await db()`SELECT * FROM asset_applications WHERE resume_hash=${s.hash} AND expires_at>now()`;
  if (!row)
    throw new HttpError(
      404,
      "This saved session has expired. Start a new application or sign in to view linked applications.",
    );
  if (row.owner_id) {
    const a = await currentActor();
    if (!a || a.id !== row.owner_id)
      throw new HttpError(
        403,
        "Sign in to the account linked to this application, or start another application.",
      );
  }
  return row as AssetApplication;
}
