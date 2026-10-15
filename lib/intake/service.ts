import { db } from "@/lib/db";
import { actor, HttpError, isAdmin, audit } from "@/lib/access";
import { listingSchema } from "@/lib/validation";
import {
  nextQuestion,
  questions,
  parseAnswer,
  type AssetApplication,
  type Answers,
} from "./questions";
export function applicationDto(
  row: Record<string, unknown>,
  staff = false,
): AssetApplication {
  const { resume_hash, expires_at, staff_notes, ...safe } = row;
  void resume_hash;
  void expires_at;
  return { ...safe, ...(staff ? { staff_notes } : {}) } as AssetApplication;
}
export async function currentActor() {
  try {
    return await actor(false);
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) return null;
    throw e;
  }
}
export function checkedAnswers(answers: Answers) {
  const checked: Answers = {};
  for (const q of questions)
    if (!q.when || q.when(checked))
      checked[q.id] = parseAnswer(q, answers[q.id]);
  if (
    checked.contact_consent !== "Yes, please contact me" ||
    nextQuestion(checked)
  )
    throw new HttpError(
      400,
      "Please finish the questions before sending your application.",
    );
  return checked;
}
export async function prepareApplicationDraft(
  id: string,
  transaction: unknown,
) {
  const a = await actor(),
    sql = db();
  const [row] =
    await sql`SELECT * FROM asset_applications WHERE id=${id} AND (owner_id=${a.id} OR ${isAdmin(a)})`;
  if (!row) throw new HttpError(404, "Application not found.");
  if (row.listing_id) return { id: row.listing_id };
  if (row.state !== "submitted" || row.status === "closed")
    throw new HttpError(
      409,
      "Complete the questionnaire before preparing an asset draft.",
    );
  if (!row.owner_id)
    throw new HttpError(
      409,
      "The applicant must link a verified account before an asset draft can be created.",
    );
  const [owner] = a.demo
    ? await sql`SELECT id,email,demo_verified FROM profiles WHERE id=${row.owner_id} AND status='active'`
    : await sql`SELECT id,email FROM profiles WHERE id=${row.owner_id} AND status='active'`;
  if (!owner)
    throw new HttpError(409, "The applicant's account is unavailable.");
  if (a.demo && !owner.demo_verified)
    throw new HttpError(
      409,
      "The applicant must verify their account before creating a draft.",
    );
  // Verified ownership of the linked account is established on claim or on
  // creation; an unverified registration cannot be used for staff conversion.
  if (row.owner_id !== a.id && !a.demo) {
    const [verified] =
      await sql`SELECT id FROM neon_auth."user" WHERE id=${row.owner_id} AND "emailVerified"=true`;
    if (!verified)
      throw new HttpError(
        409,
        "Ask the applicant to verify their account first.",
      );
  }
  const answers = checkedAnswers(row.answers as Answers),
    commodity =
      answers.commodity === "Other"
        ? answers.other_commodity
        : answers.commodity === "Not sure"
          ? "Other"
          : answers.commodity;
  const name =
    answers.asset_name || `${commodity} asset near ${answers.location}`;
  const listing = listingSchema.parse({
    title: (name.length < 8 ? `${name} - ${commodity} asset` : name).slice(
      0,
      160,
    ),
    commodity,
    country: answers.country,
    location: answers.location,
    transaction_type: transaction || answers.transaction_goal,
    asking_price: answers.asking_price ? Number(answers.asking_price) : null,
    currency:
      answers.currency ||
      (answers.country === "Lesotho"
        ? "LSL"
        : answers.country === "South Africa"
          ? "ZAR"
          : "USD"),
    area_hectares: answers.area_hectares ? Number(answers.area_hectares) : null,
    right_reference: answers.right_reference || "",
    description: `${answers.asset_type} in ${answers.location}, ${answers.other_country || answers.country}. Development stage: ${answers.development_stage}. ${answers.description}`,
  });
  const result =
    await sql`WITH source AS (SELECT id,owner_id FROM asset_applications WHERE id=${id} AND listing_id IS NULL AND state='submitted' FOR UPDATE), created AS (INSERT INTO listings(owner_id,title,commodity,country,location,description,transaction_type,asking_price,currency,area_hectares,right_reference,application_id) SELECT owner_id,${listing.title},${listing.commodity},${listing.country},${listing.location},${listing.description},${listing.transaction_type},${listing.asking_price},${listing.currency},${listing.area_hectares},${listing.right_reference},id FROM source ON CONFLICT(application_id) DO NOTHING RETURNING id), linked AS (UPDATE asset_applications SET listing_id=(SELECT id FROM created),updated_at=now(),revision=revision+1 WHERE id=${id} AND EXISTS(SELECT 1 FROM created) RETURNING listing_id,id,answers,current_question), recorded AS (INSERT INTO asset_application_events(application_id,action,current_question,snapshot) SELECT id,'draft_created',current_question,answers FROM linked RETURNING id) SELECT listing_id FROM linked WHERE EXISTS(SELECT 1 FROM recorded)`;
  if (!result.length)
    throw new HttpError(
      409,
      "A draft is already being prepared. Refresh to open it.",
    );
  await audit(a, "application_draft_created", "application", id);
  return { id: result[0].listing_id };
}
