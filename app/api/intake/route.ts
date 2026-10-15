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
import {
  validateContact,
  activeQuestions,
  nextQuestion,
  currentQuestion,
  parseAnswer,
  retainActiveAnswers,
  type Answers,
} from "@/lib/intake/questions";
import {
  applicationDto,
  checkedAnswers,
  currentActor,
  prepareApplicationDraft,
} from "@/lib/intake/service";
import { intakeSession, intakeApplication } from "@/lib/intake/session";
import { saveProgress } from "@/lib/intake/progress";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const s = await intakeSession();
    if (!s.hash) return Response.json({ application: null }, { headers });
    return Response.json(
      { application: applicationDto(await intakeApplication()) },
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
      // Consent is the first question. Older full-contact clients remain supported.
      answers =
        Object.keys(input.answers).length === 1 &&
        input.answers.contact_consent === "Yes, please contact me"
          ? { contact_consent: "Yes, please contact me" }
          : validateContact(input.answers);
    } catch (e) {
      throw new HttpError(
        400,
        e instanceof Error ? e.message : "Check your contact details.",
      );
    }
    const ip = (
      request.headers.get("x-forwarded-for")?.split(",")[0] || "local"
    ).slice(0, 80);
    await rateLimit("intake-start:" + ip, 5);
    const s = await intakeSession();
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
      reference =
        "TAF-" + randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
    const cursor = nextQuestion(answers)?.id || null;
    const [row] = await db()`WITH created AS (
      INSERT INTO asset_applications(reference,resume_hash,owner_id,contact_name,contact_email,contact_phone,contact_preference,answers,current_question,last_event)
      VALUES (${reference},${hash},${a?.id || null},${answers.contact_name || ""},${answers.contact_email || ""},${answers.contact_phone || ""},${answers.contact_preference || ""},${JSON.stringify(answers)}::jsonb,${cursor},'started') RETURNING *
    ), recorded AS (
      INSERT INTO asset_application_events(application_id,action,question,current_question,after_value,snapshot) SELECT id,'started','contact_consent',${cursor},'Yes, please contact me',answers FROM created RETURNING id
    ) SELECT created.* FROM created WHERE EXISTS(SELECT 1 FROM recorded)`;
    const response = NextResponse.json(
      { application: applicationDto(row) },
      { status: 201, headers },
    );
    response.cookies.set(s.name, token, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 86400,
    });
    return response;
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 20000)
      throw new HttpError(413, "Please send a shorter answer.");
    const data = z
      .object({
        action: z.enum([
          "answer",
          "navigate",
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
    const row = await intakeApplication(),
      sql = db();
    await rateLimit("intake-edit:" + row.id, 90);
    if (
      row.answers.contact_consent !== "Yes, please contact me" &&
      !(
        data.action === "answer" &&
        data.question === "contact_consent" &&
        data.value === "Yes, please contact me"
      )
    )
      throw new HttpError(403, "Agree to save progress before continuing.");
    if (data.action === "draft")
      return Response.json(
        await prepareApplicationDraft(row.id, data.transaction_type),
        { headers },
      );
    if (Number(row.revision) !== data.revision)
      throw new HttpError(
        409,
        "Progress changed in another tab. Reload to continue from the latest answer.",
      );
    if (data.action === "claim") {
      const a = await actor();
      if (row.owner_id && row.owner_id !== a.id)
        throw new HttpError(
          403,
          "This application is linked to another account.",
        );
      const [claimed] =
        await sql`WITH changed AS (UPDATE asset_applications SET owner_id=${a.id},updated_at=now(),last_seen_at=now(),last_event='account_linked',revision=revision+1 WHERE id=${row.id} AND revision=${data.revision} AND (owner_id IS NULL OR owner_id=${a.id}) RETURNING *), recorded AS (INSERT INTO asset_application_events(application_id,action,current_question,snapshot) SELECT id,'account_linked',current_question,answers FROM changed RETURNING id) SELECT changed.* FROM changed WHERE EXISTS(SELECT 1 FROM recorded)`;
      if (!claimed)
        throw new HttpError(409, "This application changed. Please reload.");
      return Response.json(
        { application: applicationDto(claimed) },
        { headers },
      );
    }
    let answers = row.answers as Answers,
      cursor = currentQuestion(row)?.id || null,
      action: string = data.action;
    try {
      if (data.action === "contact") {
        const contact = validateContact(data.answers || {});
        answers = {
          ...Object.fromEntries(
            Object.entries(answers).filter(
              ([key]) => !key.startsWith("contact_"),
            ),
          ),
          ...contact,
        };
        action = "contact_updated";
      } else {
        if (row.state !== "draft")
          throw new HttpError(
            409,
            "This application has already been sent to Tafari.",
          );
        if (data.action === "answer") {
          const q = currentQuestion(row);
          if (!q || q.id !== data.question)
            throw new Error("Please answer the current question first.");
          const value = parseAnswer(q, data.value);
          if (q.id === "contact_consent" && value !== "Yes, please contact me")
            throw new Error(
              "Use Stop to leave the conversation, or agree to continue.",
            );
          action = Object.hasOwn(answers, q.id)
            ? answers[q.id] === value
              ? "answer_confirmed"
              : "answer_changed"
            : value
              ? "answer_saved"
              : "answer_skipped";
          answers = retainActiveAnswers({ ...answers, [q.id]: value });
          const active = activeQuestions(answers),
            index = active.findIndex((item) => item.id === q.id);
          cursor = active[index + 1]?.id || nextQuestion(answers)?.id || null;
        } else if (data.action === "navigate" || data.action === "rewind") {
          const target = activeQuestions(answers).find(
            (q) => q.id === data.question,
          );
          if (
            !target ||
            (!Object.hasOwn(answers, target.id) &&
              target.id !== nextQuestion(answers)?.id)
          )
            throw new Error(
              "Choose an earlier answer or the next unanswered question.",
            );
          cursor = target.id;
          action = "went_back";
        } else {
          if (
            activeQuestions(answers).some(
              (q) =>
                Object.hasOwn(row.draft_answers, q.id) &&
                row.draft_answers[q.id] !== (answers[q.id] || ""),
            )
          )
            throw new Error(
              "Confirm your unfinished changes before sending. Open the marked answer and choose Continue.",
            );
          answers = checkedAnswers(answers);
          cursor = null;
          action = "submitted";
        }
      }
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(
        400,
        e instanceof Error ? e.message : "Please check your answer.",
      );
    }
    const saved = await saveProgress(
      row,
      answers,
      cursor,
      action,
      data.question || null,
      data.action === "submit",
    );
    return Response.json({ application: applicationDto(saved) }, { headers });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const s = await intakeSession(),
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
