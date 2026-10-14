import { getAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { readDemoSession, InvalidDemoSession } from "@/lib/demo/session";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type Actor = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  verified: boolean;
  demo?: boolean;
};
export function isAdmin(actor: Actor) {
  return ["staff", "super_admin"].includes(actor.role);
}
export async function actor(requireVerified = true): Promise<Actor> {
  let demo;
  try {
    demo = await readDemoSession();
  } catch (e) {
    if (e instanceof InvalidDemoSession) throw new HttpError(401, e.message);
    throw e;
  }
  if (demo) {
    const [profile] = await db()`SELECT * FROM profiles WHERE id=${demo.id}`;
    if (!profile) throw new HttpError(401, "Demo account is unavailable.");
    if (profile.status !== "active")
      throw new HttpError(
        403,
        "This demo account is suspended. Select another demo account to continue.",
      );
    if (requireVerified && !profile.demo_verified)
      throw new HttpError(
        403,
        "This demo account illustrates an unverified email. Select a verified demo account to submit changes.",
      );
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      status: profile.status,
      verified: profile.demo_verified,
      demo: true,
    };
  }
  const { data: session } = await getAuth().getSession();
  if (!session?.user) throw new HttpError(401, "Please sign in to continue.");
  const user = session.user;
  const verified = user.emailVerified === true;
  const superAdmin =
    verified &&
    user.email.toLowerCase() ===
      (process.env.SUPER_ADMIN_EMAIL || "phafanep@gmail.com").toLowerCase();
  const sql = db();
  const [profile] =
    await sql`INSERT INTO profiles (id,email,name,role) VALUES (${user.id},${user.email.toLowerCase()},${user.name},${superAdmin ? "super_admin" : "member"}) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name,role=CASE WHEN ${superAdmin} THEN 'super_admin' WHEN profiles.role='super_admin' THEN 'member' ELSE profiles.role END RETURNING *`;
  if (profile.status !== "active")
    throw new HttpError(
      403,
      "Your account is suspended. Please contact Tafari.",
    );
  if (requireVerified && !verified)
    throw new HttpError(
      403,
      "Verify your email before submitting listings, offers or files.",
    );
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: profile.role,
    status: profile.status,
    verified,
  };
}
export function admin(a: Actor) {
  if (!isAdmin(a))
    throw new HttpError(403, "Tafari back office access is required.");
}
export function superAdmin(a: Actor) {
  if (a.role !== "super_admin")
    throw new HttpError(403, "Super administrator access is required.");
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new HttpError(403, "This request must originate from this website.");
}
export async function audit(
  a: Actor,
  action: string,
  entity: string,
  id: string,
  details = "",
) {
  await db()`INSERT INTO audit_log(actor_id,action,entity,entity_id,details) VALUES (${a.id},${action},${entity},${id},${details})`;
}
export async function rateLimit(key: string, limit = 30) {
  const [row] =
    await db()`INSERT INTO rate_limits(key,bucket,count) VALUES (${key},date_trunc('minute',now()),1) ON CONFLICT(key,bucket) DO UPDATE SET count=rate_limits.count+1 RETURNING count`;
  if (row.count > limit)
    throw new HttpError(
      429,
      "Too many requests. Please wait a minute and try again.",
    );
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError")
    return Response.json(
      { error: "Please check the required fields and their allowed values." },
      { status: 400 },
    );
  console.error(
    "Platform request failed",
    error instanceof Error
      ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]")
      : "Unknown error",
  );
  return Response.json(
    { error: "We could not complete this request. Please try again." },
    { status: 500 },
  );
}
