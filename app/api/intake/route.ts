import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  actor,
  HttpError,
  sameOrigin,
  errorResponse,
  rateLimit,
} from "@/lib/access";
import { readDemoSession } from "@/lib/demo/session";
import {
  validateContact,
  nextQuestion,
  parseAnswer,
  rewindAnswers,
  type Answers,
} from "@/lib/intake/questions";
import {
  applicationDto,
  checkedAnswers,
  currentActor,
  prepareApplicationDraft,
} from "@/lib/intake/service";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
async function session() {
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
async function current() {
  const s = await session();
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
  return row;
}
export async function GET() {
  try {
    const s = await session();
    if (!s.hash) return Response.json({ application: null }, { headers });
    return Response.json(
      { application: applicationDto(await current()) },
      { headers },
    );
  } catch (e) {
    if (e instanceof HttpError && e.status === 404)
      return Response.json({ application: null }, { headers });
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 20000)
      throw new HttpError(413, "Please send a shorter answer.");
    const input = z
      .object({
        answers: z.record(z.string(), z.string().max(3000)),
        website: z.string().max(0).optional(),
      })
      .parse(await request.json());
    let answers: Answers;
    try {
      answers = validateContact(input.answers);
    } catch (e) {
      throw new HttpError(
        400,
        e instanceof Error ? e.message : "Please check your contact details.",
      );
    }
    const ip = (
      request.headers.get("x-forwarded-for")?.split(",")[0] || "local"
    ).slice(0, 80);
    await rateLimit("intake-start:" + ip, 5);
    const s = await session();
    if (s.hash) {
      const [existing] =
        await db()`SELECT id FROM asset_applications WHERE resume_hash=${s.hash} AND expires_at>now()`;
      if (existing)
        throw new HttpError(
          409,
          "You already have a saved application. Continue it, or choose Start another asset.",
        );
    }
    const a = await currentActor(),
      token = randomBytes(32).toString("hex"),
      hash = createHash("sha256").update(token).digest("hex"),
      reference = "TAF-" + randomUUID().slice(0, 8).toUpperCase();
    const [row] =
      await db()`INSERT INTO asset_applications(reference,resume_hash,owner_id,contact_name,contact_email,contact_phone,contact_preference,answers) VALUES (${reference},${hash},${a?.id || null},${answers.contact_name},${answers.contact_email || ""},${answers.contact_phone || ""},${answers.contact_preference},${JSON.stringify(answers)}::jsonb) RETURNING *`;
    const response = NextResponse.json(
      { application: applicationDto(row) },
      { status: 201, headers },
    );
    response.cookies.set(s.name, token, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 10000)
      throw new HttpError(413, "Please send a shorter answer.");
    const data = z
      .object({
        action: z.enum([
          "answer",
          "rewind",
          "submit",
          "claim",
          "draft",
          "contact",
        ]),
        answers: z.record(z.string(), z.string().max(3000)).optional(),
        revision: z.number().int().positive(),
        question: z.string().max(80).optional(),
        value: z.string().max(3000).optional(),
        transaction_type: z.string().max(40).optional(),
      })
      .parse(await request.json());
    const row = await current(),
      sql = db();
    await rateLimit("intake-edit:" + row.id, 60);
    if (data.action === "contact") {
      let contact: Answers;
      try {
        contact = validateContact(data.answers || {});
      } catch (e) {
        throw new HttpError(
          400,
          e instanceof Error ? e.message : "Check your contact details.",
        );
      }
      const answers = {
        ...Object.fromEntries(
          Object.entries(row.answers as Answers).filter(
            ([key]) => !key.startsWith("contact_"),
          ),
        ),
        ...contact,
      };
      const [saved] =
        await sql`UPDATE asset_applications SET contact_name=${contact.contact_name},contact_email=${contact.contact_email || ""},contact_phone=${contact.contact_phone || ""},contact_preference=${contact.contact_preference},answers=${JSON.stringify(answers)}::jsonb,consented_at=now(),updated_at=now(),revision=revision+1 WHERE id=${row.id} AND revision=${data.revision} RETURNING *`;
      if (!saved)
        throw new HttpError(
          409,
          "Progress changed in another tab. Reload to continue.",
        );
      return Response.json({ application: applicationDto(saved) }, { headers });
    }
    if (data.action === "claim") {
      const a = await actor();
      if (row.owner_id && row.owner_id !== a.id)
        throw new HttpError(
          403,
          "This application is linked to another account.",
        );
      const [claimed] =
        await sql`UPDATE asset_applications SET owner_id=${a.id},updated_at=now(),revision=revision+1 WHERE id=${row.id} AND (owner_id IS NULL OR owner_id=${a.id}) RETURNING *`;
      if (!claimed)
        throw new HttpError(
          409,
          "This application was linked elsewhere. Please refresh.",
        );
      return Response.json(
        { application: applicationDto(claimed) },
        { headers },
      );
    }
    if (data.action === "draft")
      return Response.json(
        await prepareApplicationDraft(row.id, data.transaction_type),
        { headers },
      );
    if (row.state !== "draft")
      throw new HttpError(
        409,
        "This application has already been sent to Tafari.",
      );
    if (Number(row.revision) !== data.revision)
      throw new HttpError(
        409,
        "Progress changed in another tab. Reload to continue from the latest answer.",
      );
    let answers = row.answers as Answers;
    try {
      if (data.action === "answer") {
        const q = nextQuestion(answers);
        if (!q || q.section === "contact" || q.id !== data.question)
          throw new Error("Please answer the current question first.");
        answers = { ...answers, [q.id]: parseAnswer(q, data.value) };
      } else if (data.action === "rewind")
        answers = rewindAnswers(answers, data.question || "");
      else answers = checkedAnswers(answers);
    } catch (e) {
      throw new HttpError(
        400,
        e instanceof Error ? e.message : "Please check your answer.",
      );
    }
    const submitted = data.action === "submit";
    const [saved] =
      await sql`UPDATE asset_applications SET answers=${JSON.stringify(answers)}::jsonb,state=${submitted ? "submitted" : "draft"},submitted_at=CASE WHEN ${submitted} THEN now() ELSE submitted_at END,updated_at=now(),revision=revision+1 WHERE id=${row.id} AND revision=${data.revision} AND state='draft' RETURNING *`;
    if (!saved)
      throw new HttpError(
        409,
        "Progress changed in another tab. Reload to continue.",
      );
    return Response.json({ application: applicationDto(saved) }, { headers });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const s = await session(),
      response = NextResponse.json({ ok: true }, { headers });
    response.cookies.set(s.name, "", {
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
