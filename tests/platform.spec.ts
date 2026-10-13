import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { del } from "@vercel/blob";
import { randomBytes } from "node:crypto";
config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL!);
const run = Date.now(),
  password = randomBytes(24).toString("base64url");
const emails = {
  owner: `tafari-e2e-owner-${run}@example.org`,
  buyer: `tafari-e2e-buyer-${run}@example.org`,
  other: `tafari-e2e-other-${run}@example.org`,
  admin: "tafari-e2e-superadmin@example.org",
};
let contexts: BrowserContext[] = [];
test.afterAll(async () => {
  const users =
    await sql`SELECT id FROM neon_auth."user" WHERE email IN (${emails.owner},${emails.buyer},${emails.other},${emails.admin})`;
  const ids = users.map((u) => u.id as string);
  if (ids.length) {
    const files =
      await sql`SELECT pathname FROM documents WHERE owner_id=ANY(${ids})`;
    for (const f of files) await del(f.pathname).catch(() => {});
    await sql.transaction([
      sql`DELETE FROM messages WHERE author_id=ANY(${ids}) OR offer_id IN (SELECT id FROM offers WHERE buyer_id=ANY(${ids}))`,
      sql`DELETE FROM document_grants WHERE user_id=ANY(${ids}) OR granted_by=ANY(${ids})`,
      sql`DELETE FROM offers WHERE buyer_id=ANY(${ids}) OR listing_id IN (SELECT id FROM listings WHERE owner_id=ANY(${ids}))`,
      sql`DELETE FROM documents WHERE owner_id=ANY(${ids})`,
      sql`DELETE FROM listings WHERE owner_id=ANY(${ids})`,
      sql`DELETE FROM audit_log WHERE actor_id=ANY(${ids})`,
      sql`DELETE FROM profiles WHERE id=ANY(${ids})`,
      sql`DELETE FROM neon_auth."user" WHERE id=ANY(${ids})`,
    ]);
  }
  for (const ctx of contexts) await ctx.close();
  contexts = [];
});
async function register(page: Page, email: string, name: string) {
  await page.goto("/auth/sign-up");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.locator("input[type=checkbox]").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/verify-email/, { timeout: 20000 });
}
async function verifiedLogin(page: Page, email: string) {
  // Only disposable fixtures are verified here; real users must verify through email.
  await sql`UPDATE neon_auth."user" SET "emailVerified"=true WHERE email=${email}`;
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: false }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20000 });
}
async function mutate(page: Page, path: string, data: unknown) {
  return page.evaluate(
    async ({ path, data }) => {
      const r = await fetch("/api/platform/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { status: r.status, body: await r.json() };
    },
    { path, data },
  );
}
test("public pages, menu and protected API", async ({ page, request }) => {
  for (const path of [
    "/",
    "/services",
    "/distribution",
    "/about",
    "/contact",
    "/how-it-works",
    "/exchange",
    "/privacy",
    "/terms",
    "/auth/sign-in",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  expect((await request.get("/api/platform/admin")).status()).toBe(401);
  expect(
    (await request.post("/api/platform/listings", { data: {} })).status(),
  ).toBe(403);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page
    .getByRole("navigation", { name: "Main menu" })
    .getByRole("link", { name: "Services", exact: true })
    .click();
  await expect(page).toHaveURL(/services/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "../../outputs/tafari-services-mobile.png",
    fullPage: true,
  });
  await page.goto("/");
  await page.screenshot({
    path: "../../outputs/tafari-home-mobile.png",
    fullPage: true,
  });
});
test("owner listing, private uploads, administrator review, buyer offer and managed closing", async ({
  browser,
  baseURL,
}) => {
  const ownerContext = await browser.newContext({ baseURL }),
    buyerContext = await browser.newContext({ baseURL }),
    adminContext = await browser.newContext({ baseURL }),
    otherContext = await browser.newContext({ baseURL });
  contexts.push(ownerContext, buyerContext, adminContext, otherContext);
  const owner = await ownerContext.newPage(),
    buyer = await buyerContext.newPage(),
    admin = await adminContext.newPage(),
    other = await otherContext.newPage();
  await register(owner, emails.owner, "Test Asset Owner");
  expect((await mutate(owner, "listings", {})).status).toBe(403);
  await verifiedLogin(owner, emails.owner);
  await owner.goto("/dashboard/listings/new");
  await owner.getByLabel("Listing title").fill("Tafari E2E Chrome Asset");
  await owner.getByLabel("Location", { exact: true }).fill("Limpopo");
  await owner
    .getByLabel("Country", { exact: false })
    .selectOption("South Africa");
  await owner.getByLabel("Commodity", { exact: false }).selectOption("Chrome");
  await owner.getByLabel("Asking price (optional)").fill("100000");
  await owner
    .getByLabel("Public asset description")
    .fill(
      "This is a disposable automated test listing for the complete asset review and managed transaction workflow. It will be removed after verification.",
    );
  await owner.getByRole("button", { name: "Create draft" }).click();
  await expect(owner).toHaveURL(/\/dashboard\/listings\/[a-f0-9-]+$/, {
    timeout: 15000,
  });
  const listingId = new URL(owner.url()).pathname.split("/").pop()!;
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF");
  for (const kind of ["title", "mandate"]) {
    await owner.getByLabel("Document category").selectOption(kind);
    await owner.getByLabel("Choose file").setInputFiles({
      name: `test-${kind}.pdf`,
      mimeType: "application/pdf",
      buffer: pdf,
    });
    await owner.getByRole("button", { name: "Upload document" }).click();
    await expect(
      owner.getByText(`test-${kind}.pdf`, { exact: true }),
    ).toBeVisible({ timeout: 25000 });
  }
  const docs =
    await sql`SELECT id,pathname FROM documents WHERE listing_id=${listingId} AND state='ready' ORDER BY created_at DESC`;
  expect(docs.length).toBe(2);
  await owner.getByLabel("I am authorized").check();
  await owner.getByRole("button", { name: "Submit for review" }).click();
  await expect(owner.locator(".badge.submitted")).toBeVisible();
  await register(buyer, emails.buyer, "Test Buyer");
  await verifiedLogin(buyer, emails.buyer);
  expect(
    (await buyer.request.get("/api/documents/" + docs[0].id)).status(),
  ).toBe(404);
  expect(
    (
      await mutate(buyer, "asset/" + listingId, {
        action: "review",
        status: "approved",
        notes: "Malicious review attempt",
      })
    ).status,
  ).toBe(404);
  await register(admin, emails.admin, "Test Tafari Administrator");
  await verifiedLogin(admin, emails.admin);
  await admin.goto("/back-office");
  await expect(
    admin.locator(".admin-sidebar").getByText("super admin", { exact: false }),
  ).toBeVisible();
  await admin
    .getByRole("button", { name: "Asset review", exact: true })
    .click();
  await admin
    .getByLabel("Review note")
    .fill("Test evidence checked and approved for this disposable test.");
  await admin.getByRole("button", { name: "Record review" }).click();
  await expect(admin.locator(".badge.approved")).toBeVisible();
  await buyer.goto("/exchange/" + listingId);
  await buyer.getByLabel("Offer amount").fill("95000");
  await buyer
    .getByLabel("Your interest & proposed terms")
    .fill(
      "Test buyer proposes a full asset sale subject to diligence and the signed transaction agreements.",
    );
  await buyer.getByLabel("I understand").check();
  await buyer.getByRole("button", { name: "Submit offer" }).click();
  await expect(buyer).toHaveURL(/\/dashboard\/deals\/[a-f0-9-]+$/, {
    timeout: 15000,
  });
  const dealId = new URL(buyer.url()).pathname.split("/").pop()!;
  await owner.goto("/dashboard/deals/" + dealId);
  await owner.getByRole("button", { name: "Accept & start diligence" }).click();
  await expect(owner.locator(".badge.accepted")).toBeVisible();
  expect(
    (
      await mutate(buyer, "deal/" + dealId, {
        action: "stage",
        stage: "Completed",
        notes: "Attempted buyer completion",
      })
    ).status,
  ).toBe(403);
  await owner.getByLabel("Confidentiality agreements").check();
  await owner
    .getByRole("button", { name: "Grant buyer access" })
    .first()
    .click();
  await expect(
    owner.getByRole("button", { name: "Grant buyer access" }).first(),
  ).toBeEnabled();
  expect(
    (await buyer.request.get("/api/documents/" + docs[0].id)).status(),
  ).toBe(200);
  await register(other, emails.other, "Unrelated Participant");
  await verifiedLogin(other, emails.other);
  expect(
    (await other.request.get("/api/documents/" + docs[0].id)).status(),
  ).toBe(404);
  expect(
    (await other.request.get("/api/platform/deal/" + dealId)).status(),
  ).toBe(404);
  await buyer
    .getByLabel("Your message")
    .fill("Please confirm the next diligence requirements.");
  await buyer.getByRole("button", { name: "Send message" }).click();
  await expect(
    buyer.getByText("Please confirm the next diligence requirements.", {
      exact: true,
    }),
  ).toBeVisible();
  await admin.goto("/dashboard/deals/" + dealId);
  expect(
    (
      await mutate(admin, "deal/" + dealId, {
        action: "stage",
        stage: "Completed",
        notes: "Attempt to skip all closing stages",
      })
    ).status,
  ).toBe(409);
  for (const stage of [
    "Agreements",
    "Regulatory approvals",
    "Closing",
    "Completed",
  ]) {
    const r = await mutate(admin, "deal/" + dealId, {
      action: "stage",
      stage,
      notes: "Automated test records completion of " + stage,
    });
    expect(r.status).toBe(200);
  }
  const [closed] = await sql`SELECT status FROM listings WHERE id=${listingId}`;
  expect(closed.status).toBe("sold");
  const [buyerProfile] =
    await sql`SELECT id FROM profiles WHERE email=${emails.buyer}`;
  expect(
    (
      await mutate(buyer, "admin/users", {
        id: buyerProfile.id,
        role: "staff",
        status: "active",
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await mutate(admin, "admin/users", {
        id: buyerProfile.id,
        role: "buyer",
        status: "suspended",
      })
    ).status,
  ).toBe(200);
  expect((await buyer.request.get("/api/platform/dashboard")).status()).toBe(
    403,
  );
  await admin.goto("/back-office");
  await admin.screenshot({
    path: "../../outputs/tafari-back-office.png",
    fullPage: true,
  });
  await owner.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(owner).toHaveURL(/\/$/);
  expect((await owner.request.get("/api/platform/dashboard")).status()).toBe(
    401,
  );
});
