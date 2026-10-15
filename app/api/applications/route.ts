import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import {
  actor,
  isAdmin,
  sameOrigin,
  errorResponse,
  HttpError,
  audit,
} from "@/lib/access";
import { db } from "@/lib/db";
import { applicationDto, prepareApplicationDraft } from "@/lib/intake/service";
import { readDemoSession } from "@/lib/demo/session";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  try {
    const a = await actor(false),
      sql = db(),
      staff = isAdmin(a);
    if (staff) await actor();
    const params = new URL(request.url).searchParams;
    const id = params.get("id");
    if (id) {
      const [row] =
        await sql`SELECT * FROM asset_applications WHERE id=${z.uuid().parse(id)} AND (owner_id=${a.id} OR ${staff})`;
      if (!row) throw new HttpError(404, "Application not found.");
      return Response.json(
        {
          application: applicationDto(row, staff),
          staff,
          canResume: row.owner_id === a.id,
        },
        { headers },
      );
    }
    const status = z
      .enum(["", "new", "contacted", "qualified", "closed"])
      .parse(params.get("status") || "");
    const search = "%" + (params.get("q") || "").slice(0, 120) + "%";
    const page = Math.max(
      0,
      Math.min(100000, Math.floor(Number(params.get("page"))) || 0),
    );
    const all = staff && params.get("scope") !== "mine";
    const [rows, [count]] = await Promise.all([
      sql`SELECT * FROM asset_applications WHERE (owner_id=${a.id} OR ${all}) AND (${status}='' OR status=${status}) AND (reference ILIKE ${search} OR contact_name ILIKE ${search} OR contact_email ILIKE ${search} OR contact_phone ILIKE ${search} OR answers->>'asset_name' ILIKE ${search}) ORDER BY created_at DESC LIMIT 30 OFFSET ${page * 30}`,
      sql`SELECT count(*) FROM asset_applications WHERE (owner_id=${a.id} OR ${all}) AND (${status}='' OR status=${status}) AND (reference ILIKE ${search} OR contact_name ILIKE ${search} OR contact_email ILIKE ${search} OR contact_phone ILIKE ${search} OR answers->>'asset_name' ILIKE ${search})`,
    ]);
    return Response.json(
      {
        applications: rows.map((row) => applicationDto(row, staff)),
        total: Number(count.count),
        staff,
      },
      { headers },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const a = await actor(),
      sql = db();
    const input = z
      .object({
        id: z.uuid(),
        action: z.enum(["review", "resume", "draft"]),
        revision: z.number().int().positive(),
        status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
        staff_notes: z.string().max(4000).optional(),
        transaction_type: z.string().max(40).optional(),
      })
      .parse(await request.json());
    const [row] =
      await sql`SELECT * FROM asset_applications WHERE id=${input.id} AND (owner_id=${a.id} OR ${isAdmin(a)})`;
    if (!row) throw new HttpError(404, "Application not found.");
    if (input.action === "draft")
      return Response.json(
        await prepareApplicationDraft(row.id, input.transaction_type),
        { headers },
      );
    if (input.action === "resume") {
      if (row.owner_id !== a.id)
        throw new HttpError(
          403,
          "Only the linked owner can resume this conversation.",
        );
      const token = randomBytes(32).toString("hex"),
        hash = createHash("sha256").update(token).digest("hex");
      await sql`UPDATE asset_applications SET resume_hash=${hash},expires_at=now()+interval '30 days' WHERE id=${row.id} AND owner_id=${a.id}`;
      const response = NextResponse.json({ ok: true }, { headers });
      const name = (await readDemoSession())
        ? "tafari_demo_intake"
        : "tafari_intake";
      response.cookies.set(name, token, {
        httpOnly: true,
        secure: new URL(request.url).protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 86400,
      });
      return response;
    }
    if (!isAdmin(a))
      throw new HttpError(403, "Tafari staff access is required.");
    if (!input.status)
      throw new HttpError(400, "Choose an application status.");
    const [updated] =
      await sql`UPDATE asset_applications SET status=${input.status},staff_notes=${input.staff_notes || ""},revision=revision+1,updated_at=now() WHERE id=${row.id} AND revision=${input.revision} RETURNING *`;
    if (!updated)
      throw new HttpError(
        409,
        "This application changed. Reload before saving.",
      );
    await audit(a, "application_reviewed", "application", row.id, input.status);
    return Response.json(
      { application: applicationDto(updated, true) },
      { headers },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
