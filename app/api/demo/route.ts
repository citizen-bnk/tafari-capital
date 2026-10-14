import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { demoAccounts } from "@/lib/demo/accounts";
import {
  demoCookie,
  demoSessionSeconds,
  issueDemoSession,
  readDemoSession,
  InvalidDemoSession,
} from "@/lib/demo/session";
import { db } from "@/lib/db";
import { sameOrigin, HttpError, errorResponse } from "@/lib/access";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const session = await readDemoSession();
    if (!session) return NextResponse.json({ demo: null }, { headers });
    const [profile] =
      await db()`SELECT id,name,email,role,status,demo_verified FROM profiles WHERE id=${session.id}`;
    if (!profile) throw new HttpError(401, "Demo account is unavailable.");
    return NextResponse.json(
      { demo: { ...profile, verified: profile.demo_verified } },
      { headers },
    );
  } catch (e) {
    if (e instanceof InvalidDemoSession)
      return NextResponse.json({ error: e.message }, { status: 401, headers });
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 2000)
      throw new HttpError(413, "Request is too large.");
    const { id } = z
      .object({ id: z.string().max(80) })
      .parse(await request.json());
    if (!demoAccounts.some((a) => a.id === id))
      throw new HttpError(400, "Select an available demo account.");
    // Keep login throttling outside the mutable demo dataset.
    const sql = neon(process.env.DATABASE_URL!);
    const ip = (
      request.headers.get("x-forwarded-for")?.split(",")[0] || "local"
    ).slice(0, 80);
    const [rate] =
      await sql`INSERT INTO public.rate_limits(key,bucket,count) VALUES (${"demo-login:" + ip},date_trunc('minute',now()),1) ON CONFLICT(key,bucket) DO UPDATE SET count=rate_limits.count+1 RETURNING count`;
    if (rate.count > 30)
      throw new HttpError(
        429,
        "Please wait a minute before switching accounts again.",
      );
    const [profile] =
      await sql`SELECT id FROM tafari_demo.profiles WHERE id=${id}`;
    if (!profile)
      throw new HttpError(
        503,
        "Demo data is being prepared. Please try again later.",
      );
    const response = NextResponse.json({ ok: true }, { headers });
    response.cookies.set(demoCookie, issueDemoSession(id), {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: demoSessionSeconds,
    });
    return response;
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const response = NextResponse.json({ ok: true }, { headers });
    response.cookies.set(demoCookie, "", {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (e) {
    return errorResponse(e);
  }
}
