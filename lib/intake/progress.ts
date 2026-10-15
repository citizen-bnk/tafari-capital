import { db } from "@/lib/db";
import { HttpError } from "@/lib/access";
import {
  currentQuestion,
  type Answers,
  type AssetApplication,
} from "./questions";

// The application update and its immutable event commit in the same SQL statement.
export async function saveProgress(
  row: AssetApplication,
  answers: Answers,
  cursor: string | null,
  action: string,
  question: string | null,
  submitted = false,
) {
  const previous = currentQuestion(row)?.id || null;
  const before = question ? (row.answers[question] ?? null) : null;
  const after = question ? (answers[question] ?? null) : null;
  const [saved] = await db()`WITH changed AS (
    UPDATE asset_applications SET answers=${JSON.stringify(answers)}::jsonb,current_question=${cursor},contact_name=${answers.contact_name || ""},contact_email=${answers.contact_email || ""},contact_phone=${answers.contact_phone || ""},contact_preference=${answers.contact_preference || ""},draft_answers=CASE WHEN ${action.startsWith("answer_")} THEN draft_answers - ${question || ""} ELSE draft_answers END,state=${submitted ? "submitted" : row.state},submitted_at=CASE WHEN ${submitted} THEN now() ELSE submitted_at END,updated_at=now(),last_seen_at=now(),last_event=${action},revision=revision+1
    WHERE id=${row.id} AND revision=${row.revision} RETURNING *
  ), recorded AS (
    INSERT INTO asset_application_events(application_id,action,question,previous_question,current_question,before_value,after_value,snapshot)
    SELECT id,${action},${question},${previous},${cursor},${before},${after},answers FROM changed RETURNING id
  ) SELECT changed.* FROM changed WHERE EXISTS(SELECT 1 FROM recorded)`;
  if (!saved)
    throw new HttpError(
      409,
      "Progress changed in another tab. Reload to continue.",
    );
  return saved;
}
