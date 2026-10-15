import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { questions, type Answers } from "../lib/intake/questions";
import { demoAccounts } from "../lib/demo/accounts";
import { sampleDocument } from "../lib/demo/document";
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_UNPOOLED)
  throw new Error("Direct database connection is required");
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
function id(key: string) {
  const h = createHash("sha256")
    .update("tafari-demo-v1:" + key)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const migrationFiles = (await readdir("migrations"))
  .filter((f) => /^\d+_.+\.sql$/.test(f))
  .sort();
const ddl = (
  await Promise.all(
    migrationFiles.map((f) => readFile("migrations/" + f, "utf8")),
  )
)
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s && s !== "BEGIN" && s !== "COMMIT");
// A fresh schema recreates the complete foreign-key graph inside the sandbox.
// Idempotent inserts preserve visitor changes on later seed runs; no live data
// is copied, truncated, updated or deleted by this script.
await sql.transaction([
  sql`CREATE SCHEMA IF NOT EXISTS tafari_demo`,
  sql`SELECT set_config('search_path','tafari_demo,pg_catalog',true)`,
  ...ddl.map((s) => sql.query(s)),
  sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_type text NOT NULL DEFAULT ''`,
  sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS demo_verified boolean NOT NULL DEFAULT true`,
  sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT ''`,
]);
const queries = [
  sql`SELECT set_config('search_path','tafari_demo,pg_catalog',true)`,
];
for (const a of demoAccounts) {
  queries.push(
    sql`INSERT INTO profiles(id,email,name,role,status,company,country,organization_type,demo_verified,logo_url,created_at) VALUES (${a.id},${a.email},${a.name},${a.role},${a.status},${a.company},${a.country},${a.organizationType},${a.verified},${a.logo_url || ""},now()-interval '90 days') ON CONFLICT(id) DO UPDATE SET logo_url=excluded.logo_url`,
  );
}
const states = [
  "approved",
  "draft",
  "submitted",
  "changes_requested",
  "withdrawn",
  "under_offer",
  "under_offer",
  "under_offer",
  "under_offer",
  "sold",
  "approved",
  "approved",
];
const stages = [
  "Offer received",
  "Offer received",
  "Offer received",
  "Offer received",
  "Offer received",
  "Due diligence",
  "Agreements",
  "Regulatory approvals",
  "Closing",
  "Completed",
  "Cancelled",
  "Offer received",
];
const commodities = ["Diamonds", "Gold", "Chrome", "Coal", "Iron ore", "Other"];
const structures = ["Full sale", "Partial stake", "Joint venture", "Offtake"];
const desk = demoAccounts.find((a) => a.role === "staff")!;
const admin = demoAccounts.find((a) => a.role === "super_admin")!;
const buyerAccounts = demoAccounts.filter(
  (a) => a.role === "buyer" && a.verified,
);
for (const [i, a] of demoAccounts
  .filter((a) => a.role === "owner" && a.status === "active")
  .entries()) {
  const key = i + 1,
    listingId = id(`listing-${key}`),
    scenario = i % 12;
  const state = states[scenario],
    commodity = commodities[i % 6],
    currency = ["LSL", "ZAR", "USD"][i % 3];
  const amount = 250000 + i * 175000;
  const title = `DEMO ${a.company} - ${commodity} opportunity`;
  const description = `Fictional ${a.organizationType.toLowerCase()} asset supplied by ${a.company}. ${a.scenario}. This demonstration exercises ${structures[i % 4].toLowerCase()} workflows, confidentiality-controlled evidence, priced offers and Tafari-managed closing. It represents no real mineral right, valuation, ownership or investment opportunity.`;
  const notes =
    state === "changes_requested"
      ? "Demo review: clarify the right reference and upload the current mandate."
      : state === "withdrawn"
        ? "Demo moderation: owner requested removal from publication."
        : state === "approved"
          ? "Demo review complete; synthetic title and mandate recorded."
          : "";
  queries.push(
    sql`INSERT INTO listings(id,owner_id,title,commodity,country,location,description,transaction_type,asking_price,currency,area_hectares,right_reference,status,review_notes,created_at) VALUES (${listingId},${a.id},${title},${commodity},${a.country},${a.country === "Lesotho" ? "Maloti demonstration district" : a.country === "South Africa" ? "Highveld demonstration district" : "Regional demonstration district"},${description},${structures[i % 4]},${i % 10 === 4 ? null : amount},${currency},${25 + i * 35},${"DEMO-RIGHT-" + String(key).padStart(3, "0")},${state},${notes},now()-(${40 - i} * interval '1 day')) ON CONFLICT DO NOTHING`,
  );
  const docKinds = [
    "title",
    "mandate",
    "technical",
    "company",
    "photo",
    "other",
  ];
  const readyDocIds: string[] = [];
  for (const [j, kind] of docKinds.entries()) {
    if (scenario === 1 && kind !== "mandate") continue;
    const documentId = id(`document-${key}-${kind}`),
      name = `DEMO ${kind} evidence ${key}.pdf`;
    const documentState =
      kind === "other" ? (i % 2 === 0 ? "pending" : "deleted") : "ready";
    if (documentState === "ready") readyDocIds.push(documentId);
    queries.push(
      sql`INSERT INTO documents(id,listing_id,owner_id,name,kind,pathname,size,content_type,state) VALUES (${documentId},${listingId},${a.id},${name},${kind},${`demo-synthetic/${listingId}/${documentId}.pdf`},${sampleDocument(name).length},'application/pdf',${documentState}) ON CONFLICT DO NOTHING`,
    );
  }
  const buyer = buyerAccounts[i % buyerAccounts.length];
  const status =
    state === "under_offer"
      ? "accepted"
      : state === "sold"
        ? "completed"
        : scenario === 10
          ? "cancelled"
          : "pending";
  if (["approved", "under_offer", "sold"].includes(state)) {
    const offerId = id(`offer-${key}`),
      stage = stages[scenario];
    queries.push(
      sql`INSERT INTO offers(id,listing_id,buyer_id,amount,currency,message,status,stage,created_at) VALUES (${offerId},${listingId},${buyer.id},${Math.round(amount * 0.92)},${currency},${"DEMO offer: " + buyer.company + " proposes a managed transaction, subject to title verification, diligence, agreements and regulatory approvals."},${status},${stage},now()-interval '10 days') ON CONFLICT DO NOTHING`,
    );
    for (const [j, [author, body]] of [
      [
        buyer.id,
        "DEMO: Please share the synthetic right evidence once confidentiality is confirmed.",
      ],
      [
        a.id,
        "DEMO: The asset pack is ready for Tafari review. No real documents are included.",
      ],
      [desk.id, `DEMO: ${stage}. Record each review before advancing.`],
    ].entries()) {
      queries.push(
        sql`INSERT INTO messages(id,offer_id,author_id,body,created_at) VALUES (${id(`message-${key}-${j}`)},${offerId},${author},${body},now()-interval '5 days'+(${j} * interval '1 minute')) ON CONFLICT DO NOTHING`,
      );
    }
    if (status === "accepted" || status === "completed") {
      for (const docId of readyDocIds.slice(0, scenario === 6 ? 1 : 3)) {
        queries.push(
          sql`INSERT INTO document_grants(document_id,user_id,granted_by) VALUES (${docId},${buyer.id},${a.id}) ON CONFLICT DO NOTHING`,
        );
      }
    }
    // Pending competition, declined offers and withdrawals on published assets.
    if (state === "approved") {
      const competitors = ["pending", "declined", "withdrawn"];
      for (const [j, competitorStatus] of competitors.entries()) {
        const competingBuyer =
          buyerAccounts[(i + j + 1) % buyerAccounts.length];
        queries.push(
          sql`INSERT INTO offers(id,listing_id,buyer_id,amount,currency,message,status) VALUES (${id(`competing-${key}-${j}`)},${listingId},${competingBuyer.id},${amount * (0.8 + j * 0.03)},${currency},${"DEMO alternative proposal from " + competingBuyer.company + "; this offer is subject to diligence and managed closing."},${competitorStatus}) ON CONFLICT DO NOTHING`,
        );
      }
    }
  }
  queries.push(
    sql`INSERT INTO audit_log(actor_id,action,entity,entity_id,details) SELECT ${desk.id},${state === "submitted" ? "listing_submit" : "listing_review"},'listing',${listingId},${"Seeded fictional scenario: " + a.scenario} WHERE NOT EXISTS(SELECT 1 FROM audit_log WHERE entity_id=${listingId} AND details=${"Seeded fictional scenario: " + a.scenario})`,
  );
}
for (let i = 0; i < 12; i++) {
  const a = demoAccounts[i],
    enquiryId = id(`enquiry-${i}`),
    status = ["new", "in_progress", "resolved"][i % 3];
  queries.push(
    sql`INSERT INTO enquiries(id,name,email,company,message,status,created_at) VALUES (${enquiryId},${a.name},${a.email},${a.company},${["DEMO enquiry: how do I list an asset as a sole proprietor?", "DEMO enquiry: we need a joint venture introduction and mandate review.", "DEMO enquiry: our multinational team needs guidance on regulatory closing.", "DEMO enquiry: how do I request private documents and confirm confidentiality?"][i % 4]},${status},now()-(${i} * interval '1 day')) ON CONFLICT DO NOTHING`,
  );
}
for (let i = 0; i < 12; i++) {
  const owner = demoAccounts.filter(
    (a) => a.role === "owner" && a.verified && a.status === "active",
  )[i];
  const answers: Answers = {
    contact_name: owner.name,
    contact_preference: "Email",
    contact_email: owner.email,
    contact_consent: "Yes, please contact me",
  };
  const full = i % 3 !== 0;
  if (full)
    for (const q of questions.filter((q) => q.section === "asset")) {
      if (q.when && !q.when(answers)) continue;
      answers[q.id] =
        (
          {
            company: owner.company,
            relationship: "I own the asset",
            asset_type: "Mining asset",
            asset_name: "DEMO guided application " + (i + 1),
            country: owner.country,
            location: "Maseru district",
            commodity: "Gold",
            development_stage: "Exploration",
            transaction_goal: "Joint venture",
            description:
              "Fictional demonstration opportunity for a guided asset application and Tafari follow-up. No actual asset is offered.",
            right_status: "Application in progress",
            documents_ready: "Not yet",
          } as Answers
        )[q.id] ?? (q.optional ? "" : q.options?.[0] || "Not yet known");
    }
  const applicationId = id("guided-application-" + i);
  const hash = createHash("sha256").update(randomBytes(32)).digest("hex");
  queries.push(
    sql`INSERT INTO asset_applications(id,reference,resume_hash,owner_id,contact_name,contact_email,contact_preference,answers,state,status,staff_notes,submitted_at) VALUES (${applicationId},${"TAF-DEMO-" + String(i + 1).padStart(2, "0")},${hash},${i === 0 ? null : owner.id},${owner.name},${owner.email},'Email',${JSON.stringify(answers)}::jsonb,${full ? "submitted" : "draft"},${["new", "contacted", "qualified", "closed"][i % 4]},'Fictional example for Tafari application review.',${full ? new Date().toISOString() : null}) ON CONFLICT DO NOTHING`,
  );
}
queries.push(
  sql`INSERT INTO audit_log(actor_id,action,entity,entity_id,details) SELECT ${admin.id},'demo_seeded','demo','v1','Fictional dataset only; real production data is isolated.' WHERE NOT EXISTS(SELECT 1 FROM audit_log WHERE action='demo_seeded')`,
);
await sql.transaction(queries);
const [counts] =
  await sql`SELECT (SELECT count(*) FROM tafari_demo.profiles WHERE role='buyer') buyers,(SELECT count(*) FROM tafari_demo.profiles WHERE role='owner') sellers,(SELECT count(*) FROM tafari_demo.profiles) users,(SELECT count(*) FROM tafari_demo.listings) listings,(SELECT count(*) FROM tafari_demo.offers) offers,(SELECT count(*) FROM tafari_demo.documents) documents,(SELECT count(*) FROM tafari_demo.messages) messages,(SELECT count(*) FROM tafari_demo.enquiries) enquiries`;
console.log("Demo seed complete (isolated schema, no credentials):", counts);
