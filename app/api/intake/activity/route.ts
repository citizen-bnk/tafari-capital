import { z } from "zod";
import { db } from "@/lib/db";
import { sameOrigin, errorResponse, rateLimit, HttpError } from "@/lib/access";
import { intakeApplication } from "@/lib/intake/session";
import { currentQuestion } from "@/lib/intake/questions";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 16000)
      throw new HttpError(413, "Answer is too long.");
    const data = z
      .object({
        action: z.enum(["viewed", "paused", "draft_saved", "stopped"]),
        question: z.string().max(80).nullable(),
        value: z.string().max(3000).optional(),
      })
      .parse(await request.json());
    const row = await intakeApplication(),
      q = currentQuestion(row);
    if (row.state !== "draft" || data.question !== (q?.id || null))
      return Response.json({ ok: true, saved: false });
    await rateLimit("intake-activity:" + row.id, 90);
    const hasDraft = !!q && data.value !== undefined && q.type !== "choice";
    if (hasDraft && data.value!.length > (q!.max || 3000))
      throw new HttpError(400, "Answer is too long.");
    const before = q
      ? (row.draft_answers?.[q.id] ?? row.answers[q.id] ?? null)
      : null;
    if (
      data.action === "draft_saved" &&
      (!hasDraft ||
        before === data.value ||
        (before === null && data.value === ""))
    )
      return Response.json({ ok: true, saved: true });
    const draft = hasDraft ? JSON.stringify({ [q!.id]: data.value }) : "{}";
    const result = await db()`WITH changed AS (
      UPDATE asset_applications SET draft_answers=draft_answers || ${draft}::jsonb,last_seen_at=now(),last_event=${data.action}
      WHERE id=${row.id} AND state='draft' AND current_question IS NOT DISTINCT FROM ${row.current_question} AND revision=${row.revision} RETURNING *
    ), recorded AS (
      INSERT INTO asset_application_events(application_id,action,question,current_question,before_value,after_value,snapshot)
      SELECT id,${data.action},${q?.id || null},${q?.id || null},${before},${hasDraft ? data.value : null},answers FROM changed RETURNING id
    ) SELECT id FROM recorded`;
    return Response.json(
      { ok: true, saved: result.length > 0 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
