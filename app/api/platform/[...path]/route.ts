import { z } from "zod";
import { db } from "@/lib/db";
import {
  actor,
  admin,
  superAdmin,
  isAdmin,
  sameOrigin,
  errorResponse,
  HttpError,
  audit,
  rateLimit,
} from "@/lib/access";
import { listingSchema, uuid, money, fileSchema } from "@/lib/validation";
import { head, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { demoSuperAdminId } from "@/lib/demo/accounts";
import { sampleDocument } from "@/lib/demo/document";
import { recordStatus } from "@/lib/navigation";
import { readDemoSession } from "@/lib/demo/session";
function publicListing(record: Record<string, unknown>, demo: boolean) {
  const { owner_id, ...safe } = record;
  return demo ? { ...safe, demo_owner_id: owner_id } : safe;
}
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const sql = db();
    if (path[0] === "listings") {
      const demo = !!(await readDemoSession());
      if (path[1]) {
        const id = uuid.parse(path[1]);
        const [listing] =
          await sql`SELECT id,owner_id,title,commodity,country,location,description,transaction_type,asking_price,currency,area_hectares,status,created_at FROM listings WHERE id=${id} AND status IN ('approved','under_offer','sold')`;
        if (!listing) throw new HttpError(404, "Listing not found.");
        return Response.json({ listing: publicListing(listing, demo) });
      }
      const q = new URL(request.url).searchParams;
      const search = (q.get("q") || "").slice(0, 120),
        country = (q.get("country") || "").slice(0, 40),
        commodity = (q.get("commodity") || "").slice(0, 60),
        offset =
          Math.max(
            0,
            Math.min(Math.floor(Number(q.get("page") || 0)) || 0, 100000),
          ) * 30;
      const [listings, [count]] = await Promise.all([
        sql`SELECT id,owner_id,title,commodity,country,location,description,transaction_type,asking_price,currency,area_hectares,status,created_at FROM listings WHERE status IN ('approved','under_offer','sold') AND (${country}='' OR country=${country}) AND (${commodity}='' OR commodity=${commodity}) AND (${search}='' OR title ILIKE ${"%" + search + "%"} OR commodity ILIKE ${"%" + search + "%"}) ORDER BY created_at DESC LIMIT 30 OFFSET ${offset}`,
        sql`SELECT count(*) FROM listings WHERE status IN ('approved','under_offer','sold') AND (${country}='' OR country=${country}) AND (${commodity}='' OR commodity=${commodity}) AND (${search}='' OR title ILIKE ${"%" + search + "%"} OR commodity ILIKE ${"%" + search + "%"})`,
      ]);
      return Response.json({
        listings: listings.map((l) => publicListing(l, demo)),
        total: Number(count.count),
      });
    }
    const a = await actor(false);
    if (path[0] === "dashboard") {
      const listings =
        await sql`SELECT * FROM listings WHERE owner_id=${a.id} ORDER BY created_at DESC LIMIT 100`;
      const offers =
        await sql`SELECT o.*,l.title,l.owner_id,p.name buyer_name FROM offers o JOIN listings l ON l.id=o.listing_id JOIN profiles p ON p.id=o.buyer_id WHERE o.buyer_id=${a.id} OR l.owner_id=${a.id} ORDER BY o.created_at DESC LIMIT 200`;
      const [profile] =
        await sql`SELECT company,phone,country FROM profiles WHERE id=${a.id}`;
      const [stats] =
        await sql`SELECT (SELECT count(*) FROM asset_applications WHERE owner_id=${a.id}) applications,(SELECT count(*) FROM listings WHERE owner_id=${a.id}) listings,(SELECT count(*) FROM listings WHERE owner_id=${a.id} AND status='submitted') review,(SELECT count(*) FROM offers o JOIN listings l ON l.id=o.listing_id WHERE (o.buyer_id=${a.id} OR l.owner_id=${a.id}) AND o.status='pending') offers,(SELECT count(*) FROM offers o JOIN listings l ON l.id=o.listing_id WHERE (o.buyer_id=${a.id} OR l.owner_id=${a.id}) AND o.status='accepted') deals`;
      return Response.json({
        actor: { ...a, ...profile },
        listings,
        offers,
        stats,
      });
    }
    if (path[0] === "records") {
      const view = z.enum(["listings", "offers"]).parse(path[1]);
      const q = new URL(request.url).searchParams,
        status = recordStatus(view, q.get("status")),
        search = "%" + (q.get("q") || "").slice(0, 120) + "%",
        offset =
          Math.max(
            0,
            Math.min(Math.floor(Number(q.get("page"))) || 0, 100000),
          ) * 30;
      if (view === "listings") {
        const [listings, [count]] = await Promise.all([
          sql`SELECT * FROM listings WHERE owner_id=${a.id} AND (${status}='' OR status=${status}) AND title ILIKE ${search} ORDER BY created_at DESC LIMIT 30 OFFSET ${offset}`,
          sql`SELECT count(*) FROM listings WHERE owner_id=${a.id} AND (${status}='' OR status=${status}) AND title ILIKE ${search}`,
        ]);
        return Response.json({ listings, total: Number(count.count) });
      }
      const [offers, [count]] = await Promise.all([
        sql`SELECT o.*,l.title,l.owner_id,p.name buyer_name FROM offers o JOIN listings l ON l.id=o.listing_id JOIN profiles p ON p.id=o.buyer_id WHERE (o.buyer_id=${a.id} OR l.owner_id=${a.id}) AND (${status}='' OR o.status=${status}) AND l.title ILIKE ${search} ORDER BY o.created_at DESC LIMIT 30 OFFSET ${offset}`,
        sql`SELECT count(*) FROM offers o JOIN listings l ON l.id=o.listing_id WHERE (o.buyer_id=${a.id} OR l.owner_id=${a.id}) AND (${status}='' OR o.status=${status}) AND l.title ILIKE ${search}`,
      ]);
      return Response.json({ offers, total: Number(count.count) });
    }
    if (path[0] === "asset") {
      const id = uuid.parse(path[1]);
      const [listing] =
        await sql`SELECT * FROM listings WHERE id=${id} AND (owner_id=${a.id} OR ${isAdmin(a)})`;
      if (!listing) throw new HttpError(404, "Listing not found.");
      const documents =
        await sql`SELECT id,name,kind,size,state,created_at FROM documents WHERE listing_id=${id} AND state<>'deleted' ORDER BY created_at DESC`;
      return Response.json({ listing, documents });
    }
    if (path[0] === "deal") {
      const id = uuid.parse(path[1]);
      const [offer] =
        await sql`SELECT o.*,l.title,l.owner_id,p.name buyer_name FROM offers o JOIN listings l ON l.id=o.listing_id JOIN profiles p ON p.id=o.buyer_id WHERE o.id=${id} AND (o.buyer_id=${a.id} OR l.owner_id=${a.id} OR ${isAdmin(a)})`;
      if (!offer) throw new HttpError(404, "Deal not found.");
      const messages =
        await sql`SELECT m.id,m.body,m.created_at,p.name author_name,p.role author_role FROM messages m JOIN profiles p ON p.id=m.author_id WHERE offer_id=${id} ORDER BY m.created_at`;
      const documents =
        await sql`SELECT d.id,d.name,d.kind,d.size,d.state FROM documents d WHERE d.listing_id=${offer.listing_id} AND d.state='ready' AND (d.owner_id=${a.id} OR ${isAdmin(a)} OR EXISTS(SELECT 1 FROM document_grants g WHERE g.document_id=d.id AND g.user_id=${a.id})) ORDER BY created_at DESC`;
      return Response.json({ offer, messages, documents, actor: a });
    }
    if (path[0] === "admin") {
      if (!a.verified)
        throw new HttpError(
          403,
          "Verify your email to access the back office.",
        );
      admin(a);
      const q = new URL(request.url).searchParams,
        tab = q.get("tab") || "overview",
        status = recordStatus(tab, q.get("status")),
        listingStatus = tab === "listings" ? status : "",
        offerStatus = tab === "offers" ? status : "",
        userStatus = tab === "users" ? status : "",
        enquiryStatus = tab === "enquiries" ? status : "",
        documentStatus = tab === "documents" ? status : "",
        search = "%" + (q.get("q") || "").slice(0, 120) + "%",
        offset =
          Math.max(
            0,
            Math.min(Math.floor(Number(q.get("page") || 0)) || 0, 100000),
          ) * 50;
      const [listings, offers, users, enquiries, audits, documents] =
        await Promise.all([
          sql`SELECT l.*,p.name owner_name,p.email owner_email FROM listings l JOIN profiles p ON p.id=l.owner_id WHERE (l.title ILIKE ${search} OR p.email ILIKE ${search}) AND (${listingStatus}='' OR l.status=${listingStatus}) ORDER BY l.created_at DESC LIMIT 50 OFFSET ${offset}`,
          sql`SELECT o.*,l.title,l.owner_id,p.name buyer_name,p.email buyer_email FROM offers o JOIN listings l ON l.id=o.listing_id JOIN profiles p ON p.id=o.buyer_id WHERE (l.title ILIKE ${search} OR p.email ILIKE ${search}) AND (${offerStatus}='' OR o.status=${offerStatus}) ORDER BY o.created_at DESC LIMIT 50 OFFSET ${offset}`,
          sql`SELECT * FROM profiles WHERE (name ILIKE ${search} OR email ILIKE ${search}) AND (${userStatus}='' OR status=${userStatus}) ORDER BY created_at DESC LIMIT 50 OFFSET ${offset}`,
          sql`SELECT * FROM enquiries WHERE (name ILIKE ${search} OR email ILIKE ${search} OR message ILIKE ${search}) AND (${enquiryStatus}='' OR status=${enquiryStatus}) ORDER BY created_at DESC LIMIT 50 OFFSET ${offset}`,
          sql`SELECT a.*,p.name actor_name FROM audit_log a JOIN profiles p ON p.id=a.actor_id WHERE a.action ILIKE ${search} OR p.name ILIKE ${search} ORDER BY a.created_at DESC LIMIT 50 OFFSET ${offset}`,
          sql`SELECT d.id,d.listing_id,d.owner_id,d.name,d.kind,d.size,d.state,d.created_at,l.title FROM documents d LEFT JOIN listings l ON l.id=d.listing_id WHERE d.state<>'deleted' AND (d.name ILIKE ${search} OR l.title ILIKE ${search}) AND (${documentStatus}='' OR d.state=${documentStatus}) ORDER BY d.created_at DESC LIMIT 50 OFFSET ${offset}`,
        ]);
      const [stats] =
        await sql`SELECT (SELECT count(*) FROM asset_applications WHERE status='new') applications,(SELECT count(*) FROM listings WHERE status='submitted') review,(SELECT count(*) FROM offers WHERE status='accepted') deals,(SELECT count(*) FROM profiles) users,(SELECT count(*) FROM enquiries WHERE status='new') enquiries`;
      return Response.json({
        actor: a,
        listings,
        offers,
        users,
        enquiries,
        audits,
        documents,
        stats,
      });
    }
    throw new HttpError(404, "Not found.");
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > 50000)
      throw new HttpError(413, "Request is too large.");
    const { path } = await context.params;
    const data = await request.json(),
      sql = db();
    if (path[0] === "enquiries") {
      const v = z
        .object({
          name: z.string().trim().min(2).max(120),
          email: z.string().email().max(200),
          company: z.string().trim().max(160),
          message: z.string().trim().min(20).max(5000),
          consent: z.literal(true),
          website: z.string().max(0).optional(),
        })
        .parse(data);
      await rateLimit(
        "enquiry:" +
          (request.headers.get("x-forwarded-for")?.split(",")[0] || "local"),
        5,
      );
      await sql`INSERT INTO enquiries(name,email,company,message) VALUES (${v.name},${v.email},${v.company},${v.message})`;
      return Response.json({ ok: true });
    }
    const a = await actor();
    await rateLimit("mutate:" + a.id, 45);
    if (path[0] === "profile") {
      const v = z
        .object({
          role: z.enum(["owner", "buyer", "partner", "member"]),
          company: z.string().trim().max(160),
          phone: z.string().trim().max(40),
          country: z.string().trim().max(80),
        })
        .parse(data);
      await sql`UPDATE profiles SET company=${v.company},phone=${v.phone},country=${v.country},role=CASE WHEN role IN ('staff','super_admin') THEN role ELSE ${v.role} END WHERE id=${a.id}`;
      await audit(a, "profile_updated", "user", a.id);
      return Response.json({ ok: true });
    }
    if (path[0] === "listings") {
      const v = listingSchema.parse(data);
      const [listing] =
        await sql`INSERT INTO listings(owner_id,title,commodity,country,location,description,transaction_type,asking_price,currency,area_hectares,right_reference) VALUES (${a.id},${v.title},${v.commodity},${v.country},${v.location},${v.description},${v.transaction_type},${v.asking_price},${v.currency},${v.area_hectares},${v.right_reference}) RETURNING id`;
      await audit(a, "listing_created", "listing", listing.id);
      return Response.json({ id: listing.id }, { status: 201 });
    }
    if (path[0] === "asset") {
      const id = uuid.parse(path[1]);
      const [l] =
        await sql`SELECT * FROM listings WHERE id=${id} AND (owner_id=${a.id} OR ${isAdmin(a)})`;
      if (!l) throw new HttpError(404, "Listing not found.");
      const action = z
        .enum(["update", "submit", "withdraw", "review"])
        .parse(data.action);
      if (action === "update") {
        if (!["draft", "changes_requested"].includes(l.status))
          throw new HttpError(
            409,
            "Only drafts and listings needing changes can be edited. Withdraw the listing before revising it.",
          );
        const v = listingSchema.parse(data);
        await sql`UPDATE listings SET title=${v.title},commodity=${v.commodity},country=${v.country},location=${v.location},description=${v.description},transaction_type=${v.transaction_type},asking_price=${v.asking_price},currency=${v.currency},area_hectares=${v.area_hectares},right_reference=${v.right_reference},updated_at=now() WHERE id=${id} AND status=${l.status}`;
      }
      if (action === "submit") {
        if (!["draft", "changes_requested"].includes(l.status))
          throw new HttpError(409, "This listing is already submitted.");
        if (data.mandate_confirmed !== true)
          throw new HttpError(
            400,
            "Confirm your authority to offer this asset.",
          );
        const [docs] =
          await sql`SELECT count(*) FILTER(WHERE kind='title') title,count(*) FILTER(WHERE kind='mandate') mandate FROM documents WHERE listing_id=${id} AND state='ready'`;
        if (Number(docs.title) < 1 || Number(docs.mandate) < 1)
          throw new HttpError(
            400,
            "Upload title/right evidence and a signed mandate before submitting.",
          );
        await sql`UPDATE listings SET status='submitted',review_notes='',updated_at=now() WHERE id=${id} AND status=${l.status}`;
      }
      if (action === "withdraw") {
        if (["sold", "under_offer"].includes(l.status))
          throw new HttpError(
            409,
            "Contact Tafari to cancel an active transaction.",
          );
        const changed =
          await sql`WITH withdrawn AS (UPDATE listings SET status='draft',updated_at=now() WHERE id=${id} AND status NOT IN ('sold','under_offer') RETURNING id), declined AS (UPDATE offers SET status='declined',updated_at=now() WHERE listing_id IN (SELECT id FROM withdrawn) AND status='pending') SELECT id FROM withdrawn`;
        if (!changed.length)
          throw new HttpError(
            409,
            "The listing has entered a transaction. Refresh before trying again.",
          );
      }
      if (action === "review") {
        admin(a);
        const v = z
          .object({
            status: z.enum(["approved", "changes_requested", "withdrawn"]),
            notes: z.string().trim().min(5).max(3000),
          })
          .parse(data);
        if (!["submitted", "approved", "changes_requested"].includes(l.status))
          throw new HttpError(
            409,
            "This listing cannot be reviewed in its current state.",
          );
        if (v.status === "approved") {
          const [docs] =
            await sql`SELECT count(*) FILTER(WHERE kind='title') title,count(*) FILTER(WHERE kind='mandate') mandate FROM documents WHERE listing_id=${id} AND state='ready'`;
          if (Number(docs.title) < 1 || Number(docs.mandate) < 1)
            throw new HttpError(
              400,
              "Title/right evidence and a signed mandate are required before publication.",
            );
        }
        await sql`UPDATE listings SET status=${v.status},review_notes=${v.notes},updated_at=now() WHERE id=${id} AND status=${l.status}`;
      }
      await audit(
        a,
        "listing_" + action,
        "listing",
        id,
        action === "review" ? data.notes : "",
      );
      return Response.json({ ok: true });
    }
    if (path[0] === "offers") {
      const v = z
        .object({
          listing_id: uuid,
          amount: money,
          currency: z.enum(["USD", "ZAR", "LSL"]),
          message: z.string().trim().min(20).max(5000),
          consent: z.literal(true),
        })
        .parse(data);
      const [offer] =
        await sql`WITH available AS (SELECT id FROM listings WHERE id=${v.listing_id} AND status='approved' AND owner_id<>${a.id} AND currency=${v.currency} FOR UPDATE) INSERT INTO offers(listing_id,buyer_id,amount,currency,message) SELECT id,${a.id},${v.amount},${v.currency},${v.message} FROM available ON CONFLICT DO NOTHING RETURNING id`;
      if (!offer)
        throw new HttpError(
          409,
          "This asset is unavailable, belongs to you, or you already have an active offer. Use the listing currency.",
        );
      await audit(a, "offer_created", "offer", offer.id);
      return Response.json({ id: offer.id }, { status: 201 });
    }
    if (path[0] === "deal") {
      const id = uuid.parse(path[1]);
      const [o] =
        await sql`SELECT o.*,l.owner_id,l.status listing_status FROM offers o JOIN listings l ON l.id=o.listing_id WHERE o.id=${id} AND (o.buyer_id=${a.id} OR l.owner_id=${a.id} OR ${isAdmin(a)})`;
      if (!o) throw new HttpError(404, "Deal not found.");
      const action = z
        .enum([
          "message",
          "accept",
          "decline",
          "withdraw",
          "stage",
          "grant",
          "revoke",
        ])
        .parse(data.action);
      if (action === "message") {
        const body = z.string().trim().min(1).max(5000).parse(data.body);
        await sql`INSERT INTO messages(offer_id,author_id,body) VALUES (${id},${a.id},${body})`;
      } else if (action === "accept") {
        if (o.owner_id !== a.id && !isAdmin(a))
          throw new HttpError(
            403,
            "Only the owner or Tafari can accept an offer.",
          );
        if (o.status !== "pending" || o.listing_status !== "approved")
          throw new HttpError(
            409,
            "This offer is no longer available for acceptance.",
          );
        const result =
          await sql`WITH reserved AS (UPDATE listings SET status='under_offer',updated_at=now() WHERE id=${o.listing_id} AND status='approved' RETURNING id), accepted AS (UPDATE offers SET status='accepted',stage='Due diligence',updated_at=now() WHERE id=${id} AND status='pending' AND EXISTS(SELECT 1 FROM reserved) RETURNING id) SELECT id FROM accepted`;
        if (!result.length)
          throw new HttpError(409, "Another offer has already been accepted.");
        await sql`UPDATE offers SET status='declined',updated_at=now() WHERE listing_id=${o.listing_id} AND id<>${id} AND status='pending'`;
      } else if (action === "decline" || action === "withdraw") {
        if (action === "decline" && o.owner_id !== a.id && !isAdmin(a))
          throw new HttpError(403, "Owner access is required.");
        if (action === "withdraw" && o.buyer_id !== a.id && !isAdmin(a))
          throw new HttpError(403, "Buyer access is required.");
        if (o.status !== "pending")
          throw new HttpError(
            409,
            "Only pending offers can be declined or withdrawn.",
          );
        await sql`UPDATE offers SET status=${action === "decline" ? "declined" : "withdrawn"},updated_at=now() WHERE id=${id} AND status='pending'`;
      } else if (action === "stage") {
        admin(a);
        const stage = z
          .enum([
            "Due diligence",
            "Agreements",
            "Regulatory approvals",
            "Closing",
            "Completed",
            "Cancelled",
          ])
          .parse(data.stage);
        const notes = z.string().trim().min(10).max(5000).parse(data.notes);
        if (o.status !== "accepted")
          throw new HttpError(
            409,
            "Only accepted offers enter the closing process.",
          );
        const steps = [
          "Due diligence",
          "Agreements",
          "Regulatory approvals",
          "Closing",
          "Completed",
        ];
        if (
          stage !== "Cancelled" &&
          steps.indexOf(stage) !== steps.indexOf(o.stage) + 1
        )
          throw new HttpError(
            409,
            "Complete the current stage before advancing to the next.",
          );
        const changed =
          await sql`WITH advanced AS (UPDATE offers SET stage=${stage},status=${stage === "Completed" ? "completed" : stage === "Cancelled" ? "cancelled" : "accepted"},updated_at=now() WHERE id=${id} AND status='accepted' AND stage=${o.stage} RETURNING id,listing_id), asset AS (UPDATE listings SET status=${stage === "Completed" ? "sold" : stage === "Cancelled" ? "approved" : "under_offer"},updated_at=now() WHERE id IN (SELECT listing_id FROM advanced)), note AS (INSERT INTO messages(offer_id,author_id,body) SELECT id,${a.id},${stage + ": " + notes} FROM advanced) SELECT id FROM advanced`;
        if (!changed.length)
          throw new HttpError(
            409,
            "The transaction has changed. Refresh before trying again.",
          );
      } else if (action === "grant" || action === "revoke") {
        if (o.owner_id !== a.id && !isAdmin(a))
          throw new HttpError(
            403,
            "Only the owner or Tafari can share documents.",
          );
        const documentId = uuid.parse(data.document_id);
        if (action === "grant") {
          if (data.confidentiality_confirmed !== true)
            throw new HttpError(
              400,
              "Confirm confidentiality agreements are in place before sharing.",
            );
          await sql`INSERT INTO document_grants(document_id,user_id,granted_by) SELECT id,${o.buyer_id},${a.id} FROM documents WHERE id=${documentId} AND listing_id=${o.listing_id} AND state='ready' ON CONFLICT DO NOTHING`;
        } else
          await sql`DELETE FROM document_grants WHERE document_id=${documentId} AND user_id=${o.buyer_id} AND EXISTS(SELECT 1 FROM documents WHERE id=${documentId} AND listing_id=${o.listing_id})`;
      }
      await audit(a, "deal_" + action, "offer", id);
      return Response.json({ ok: true });
    }
    if (path[0] === "documents" && path[1] === "init") {
      if (a.demo)
        throw new HttpError(
          403,
          "Use a synthetic sample document in the demo. Register to upload your own files.",
        );
      const v = fileSchema.parse(data);
      const [l] =
        await sql`SELECT id,owner_id FROM listings WHERE id=${v.listing_id} AND (owner_id=${a.id} OR ${isAdmin(a)})`;
      if (!l) throw new HttpError(404, "Listing not found.");
      const [count] =
        await sql`SELECT count(*) FROM documents WHERE listing_id=${v.listing_id} AND state<>'deleted'`;
      if (Number(count.count) >= 30)
        throw new HttpError(400, "A listing can have up to 30 documents.");
      const id = randomUUID(),
        name = v.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
        pathname = `assets/${v.listing_id}/${id}/${name}`;
      await sql`INSERT INTO documents(id,listing_id,owner_id,name,kind,pathname,size,content_type) VALUES (${id},${v.listing_id},${l.owner_id},${v.name},${v.kind},${pathname},${v.size},${v.content_type})`;
      return Response.json({ id, pathname }, { status: 201 });
    }
    if (path[0] === "documents" && path[1] === "sample") {
      if (!a.demo)
        throw new HttpError(
          403,
          "Sample evidence is available only in the demo.",
        );
      const v = z
        .object({
          listing_id: uuid,
          kind: z.enum([
            "title",
            "mandate",
            "technical",
            "company",
            "photo",
            "other",
          ]),
        })
        .parse(data);
      const [listing] =
        await sql`SELECT id,owner_id FROM listings WHERE id=${v.listing_id} AND (owner_id=${a.id} OR ${isAdmin(a)})`;
      if (!listing) throw new HttpError(404, "Listing not found.");
      const [count] =
        await sql`SELECT count(*) FROM documents WHERE listing_id=${v.listing_id} AND state<>'deleted'`;
      if (Number(count.count) >= 30)
        throw new HttpError(400, "A listing can have up to 30 documents.");
      const id = randomUUID(),
        name = `DEMO ${v.kind} evidence.pdf`;
      await sql`INSERT INTO documents(id,listing_id,owner_id,name,kind,pathname,size,content_type,state) VALUES (${id},${v.listing_id},${listing.owner_id},${name},${v.kind},${`demo-synthetic/${v.listing_id}/${id}.pdf`},${sampleDocument(name).length},'application/pdf','ready')`;
      await audit(a, "demo_sample_added", "document", id);
      return Response.json({ id }, { status: 201 });
    }
    if (path[0] === "documents") {
      const id = uuid.parse(path[1]),
        action = z.enum(["complete", "delete"]).parse(data.action);
      const [d] =
        await sql`SELECT * FROM documents WHERE id=${id} AND state<>'deleted' AND (owner_id=${a.id} OR ${isAdmin(a)})`;
      if (!d) throw new HttpError(404, "File not found.");
      if (action === "complete") {
        if (a.demo)
          throw new HttpError(
            403,
            "Synthetic demo documents do not use cloud uploads.",
          );
        const blob = await head(d.pathname);
        if (blob.size !== Number(d.size) || blob.contentType !== d.content_type)
          throw new HttpError(
            400,
            "File metadata does not match the upload request.",
          );
        await sql`UPDATE documents SET state='ready' WHERE id=${id} AND state='pending'`;
      } else {
        const [listing] =
          await sql`SELECT status FROM listings WHERE id=${d.listing_id}`;
        if (
          !isAdmin(a) &&
          !["draft", "changes_requested"].includes(listing?.status)
        )
          throw new HttpError(
            409,
            "Return the asset to draft before removing supporting evidence.",
          );
        await sql`UPDATE documents SET state='deleted' WHERE id=${id}`;
        if (!a.demo) {
          try {
            await del(d.pathname);
          } catch {
            console.error("Blob cleanup pending for document", id);
          }
        }
      }
      await audit(a, "document_" + action, "document", id);
      return Response.json({ ok: true });
    }
    if (path[0] === "admin") {
      admin(a);
      if (path[1] === "users") {
        superAdmin(a);
        const v = z
          .object({
            id: z.string().min(1),
            role: z.enum(["member", "owner", "buyer", "partner", "staff"]),
            status: z.enum(["active", "suspended"]),
          })
          .parse(data);
        const [u] = await sql`SELECT * FROM profiles WHERE id=${v.id}`;
        if (!u) throw new HttpError(404, "User not found.");
        if (
          (a.demo && u.id === demoSuperAdminId) ||
          u.email.toLowerCase() ===
            (
              process.env.SUPER_ADMIN_EMAIL || "phafanep@gmail.com"
            ).toLowerCase()
        )
          throw new HttpError(
            400,
            "The designated super administrator cannot be demoted or suspended.",
          );
        await sql`UPDATE profiles SET role=${v.role},status=${v.status} WHERE id=${v.id}`;
        await audit(a, "user_updated", "user", v.id, `${v.role}; ${v.status}`);
      } else if (path[1] === "enquiries") {
        const v = z
          .object({
            id: uuid,
            status: z.enum(["new", "in_progress", "resolved"]),
          })
          .parse(data);
        await sql`UPDATE enquiries SET status=${v.status} WHERE id=${v.id}`;
        await audit(a, "enquiry_updated", "enquiry", v.id, v.status);
      } else throw new HttpError(404, "Not found.");
      return Response.json({ ok: true });
    }
    throw new HttpError(404, "Not found.");
  } catch (error) {
    return errorResponse(error);
  }
}
