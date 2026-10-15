import { test, expect, type Page } from "@playwright/test";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import {
  demoAccounts,
  demoRoles,
  demoSuperAdminId,
} from "../lib/demo/accounts";
config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL!);
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const liveId = "isolation-canary-" + randomUUID(),
  liveListing = randomUUID(),
  liveDocument = randomUUID();
const created: string[] = [];
const registrationEmail = `tafari-demo-exit-${randomUUID()}@example.org`;
async function login(page: Page, id: string) {
  const r = await page.request.post("/api/demo", {
    headers: { origin: base },
    data: { id },
  });
  expect(r.status()).toBe(200);
}
async function mutate(page: Page, path: string, data: unknown) {
  return page.request.post("/api/platform/" + path, {
    headers: { origin: base },
    data,
  });
}
test.beforeAll(async () => {
  await sql.transaction([
    sql`INSERT INTO public.profiles(id,email,name) VALUES (${liveId},${liveId + "@example.org"},'Real-scope isolation canary')`,
    sql`INSERT INTO public.listings(id,owner_id,title,commodity,country,location,description,transaction_type,currency,status) VALUES (${liveListing},${liveId},'Real-scope isolation canary asset','Gold','Lesotho','Test','Private test fixture for checking demo isolation. Never a seeded demo listing.','Full sale','USD','draft')`,
    sql`INSERT INTO public.documents(id,listing_id,owner_id,name,kind,pathname,size,content_type,state) VALUES (${liveDocument},${liveListing},${liveId},'private-canary.pdf','title',${"canary/" + liveDocument},100,'application/pdf','ready')`,
  ]);
});
test.afterAll(async () => {
  await sql.transaction([
    sql`DELETE FROM tafari_demo.audit_log WHERE entity_id=ANY(${created}) OR entity_id IN (SELECT id::text FROM tafari_demo.offers WHERE listing_id::text=ANY(${created}))`,
    sql`DELETE FROM tafari_demo.messages WHERE offer_id IN (SELECT id FROM tafari_demo.offers WHERE listing_id::text=ANY(${created}))`,
    sql`DELETE FROM tafari_demo.document_grants WHERE document_id IN (SELECT id FROM tafari_demo.documents WHERE listing_id::text=ANY(${created}))`,
    sql`DELETE FROM tafari_demo.offers WHERE listing_id::text=ANY(${created})`,
    sql`DELETE FROM tafari_demo.documents WHERE listing_id::text=ANY(${created})`,
    sql`DELETE FROM tafari_demo.listings WHERE id::text=ANY(${created})`,
    sql`DELETE FROM public.documents WHERE id=${liveDocument}`,
    sql`DELETE FROM public.listings WHERE id=${liveListing}`,
    sql`DELETE FROM public.profiles WHERE id=${liveId}`,
    sql`DELETE FROM public.profiles WHERE email=${registrationEmail}`,
    sql`DELETE FROM neon_auth."user" WHERE email=${registrationEmail}`,
  ]);
});
test("real registration exits demo and creates an ordinary private account", async ({
  page,
}) => {
  await login(page, demoSuperAdminId);
  const r = await page.request.post("/api/auth/sign-up/email", {
    headers: { origin: base },
    data: {
      email: registrationEmail,
      password: randomBytes(24).toString("base64url"),
      name: "Disposable Registration Boundary",
      callbackURL: base + "/dashboard",
    },
  });
  expect(r.status()).toBe(200);
  expect((await (await page.request.get("/api/demo")).json()).demo).toBeNull();
  const dashboard = await (
    await page.request.get("/api/platform/dashboard")
  ).json();
  expect(dashboard.actor.email).toBe(registrationEmail);
  expect(dashboard.actor.role).toBe("member");
  expect(dashboard.actor.demo).not.toBe(true);
  expect(demoAccounts.some((a) => a.email === registrationEmail)).toBe(false);
  expect((await page.request.get("/api/platform/admin")).status()).toBe(403);
});
test("demo selector offers every role on desktop and mobile with one-click login", async ({
  page,
}) => {
  await page.goto("/auth/sign-in");
  await page.getByText("Explore with a demo account", { exact: false }).click();
  await expect(
    page
      .getByRole("region", { name: "Demo accounts" })
      .or(page.locator(".demo-accounts")),
  ).toBeVisible();
  await expect(page.locator(".demo-selector:visible .demo-account")).toHaveCount(67);
  for (const role of demoRoles) {
    await page.goto("/auth/sign-in");
    await page.locator(".demo-selector:visible summary").click();
    await page.getByRole("combobox", { name: "Demo role", exact: true }).selectOption(role);
    const a = demoAccounts.find(
      (a) => a.role === role && a.status === "active" && a.verified,
    )!;
    await page
      .getByRole("button", { name: "Try " + a.company, exact: true })
      .click();
    await expect(page).toHaveURL(
      ["staff", "super_admin"].includes(role)
        ? /\/back-office$/
        : /\/dashboard$/,
      { timeout: 20000 },
    );
    await expect(page.getByLabel("Demo session")).toContainText(
      "Demo workspace",
    );
    const r = await page.request.get("/api/platform/dashboard");
    expect(r.status()).toBe(200);
    expect((await r.json()).actor.role).toBe(role);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/sign-in");
  await page.locator(".demo-selector:visible summary").click();
  await page.getByRole("combobox", { name: "Demo role", exact: true }).selectOption("owner");
  await expect(page.locator(".demo-selector:visible .demo-account")).toHaveCount(41);
  await page.getByRole("searchbox", { name: "Find a demo account" }).fill("Multinational");
  expect(await page.locator(".demo-selector:visible .demo-account").count()).toBeGreaterThan(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../../outputs/tafari-demo-selector-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Leave demo", exact: true }).click();
  await expect(page.getByLabel("Demo session")).toHaveCount(0);
  expect((await page.request.get("/api/platform/admin")).status()).toBe(401);
});
test("demo isolation, role boundaries, suspended and unverified accounts, forged cookies", async ({
  page,
  browser,
}) => {
  await login(page, demoSuperAdminId);
  const admin = await (await page.request.get("/api/platform/admin")).json();
  expect(Number(admin.stats.users)).toBe(67);
  expect(JSON.stringify(admin)).not.toContain(liveId);
  expect(
    (await page.request.get("/api/platform/asset/" + liveListing)).status(),
  ).toBe(404);
  expect(
    (await page.request.get("/api/documents/" + liveDocument)).status(),
  ).toBe(404);
  expect(
    (
      await mutate(page, "admin/users", {
        id: liveId,
        role: "staff",
        status: "suspended",
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await mutate(page, "admin/users", {
        id: demoSuperAdminId,
        role: "member",
        status: "suspended",
      })
    ).status(),
  ).toBe(400);
  const anonymous = await browser.newContext();
  try {
    const live = await (
      await anonymous.request.get(base + "/api/platform/listings")
    ).json();
    expect(JSON.stringify(live)).not.toContain("DEMO");
    expect(
      (await anonymous.request.get(base + "/api/platform/admin")).status(),
    ).toBe(401);
  } finally {
    await anonymous.close();
  }
  await login(page, demoAccounts.find((a) => a.role === "staff")!.id);
  expect(
    (
      await mutate(page, "admin/users", {
        id: demoAccounts.find((a) => a.role === "member")!.id,
        role: "buyer",
        status: "active",
      })
    ).status(),
  ).toBe(403);
  await login(page, "demo-buyer-01");
  expect((await page.request.get("/api/platform/admin")).status()).toBe(403);
  await login(page, "demo-suspended-owner");
  expect((await page.request.get("/api/platform/dashboard")).status()).toBe(
    403,
  );
  await login(page, "demo-unverified-buyer");
  expect((await page.request.get("/api/platform/dashboard")).status()).toBe(
    200,
  );
  expect((await mutate(page, "listings", {})).status()).toBe(403);
  expect(
    (
      await page.request.post("/api/demo", {
        headers: { origin: "https://untrusted.example" },
        data: { id: demoSuperAdminId },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/demo", {
        headers: { origin: base },
        data: { id: liveId },
      })
    ).status(),
  ).toBe(400);
  await page
    .context()
    .addCookies([
      { name: "tafari_demo_session", value: "forged.payload", url: base },
    ]);
  expect((await page.request.get("/api/platform/admin")).status()).toBe(401);
  // Signed but expired demo cookies also fail closed.
  const payload = Buffer.from(
    JSON.stringify({
      purpose: "tafari-demo-v1",
      id: demoSuperAdminId,
      exp: 1,
      nonce: "test",
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", process.env.NEON_AUTH_COOKIE_SECRET!)
    .update("tafari-demo-v1:" + payload)
    .digest("base64url");
  await page
    .context()
    .addCookies([
      { name: "tafari_demo_session", value: payload + "." + sig, url: base },
    ]);
  expect((await page.request.get("/api/platform/dashboard")).status()).toBe(
    401,
  );
  const [canary] =
    await sql`SELECT role,status FROM public.profiles WHERE id=${liveId}`;
  expect(canary).toEqual({ role: "member", status: "active" });
});
test("demo evidence, review, offer, document grants, managed closing and audit use the real workflow", async ({
  page,
}) => {
  await login(page, "demo-owner-01");
  const r = await mutate(page, "listings", {
    title: "DEMO test workflow " + randomUUID(),
    commodity: "Gold",
    country: "Lesotho",
    location: "Synthetic district",
    description:
      "Fictional test asset for a complete demo review and closing workflow, with no real mineral right or valuation.",
    transaction_type: "Joint venture",
    asking_price: 100000,
    currency: "LSL",
    area_hectares: 50,
    right_reference: "DEMO-TEST",
  });
  expect(r.status()).toBe(201);
  const listingId = (await r.json()).id;
  created.push(listingId);
  expect(
    (
      await mutate(page, "asset/" + listingId, {
        action: "submit",
        mandate_confirmed: true,
      })
    ).status(),
  ).toBe(400);
  expect((await mutate(page, "documents/init", {})).status()).toBe(403);
  let titleId = "";
  for (const kind of ["title", "mandate"]) {
    const doc = await mutate(page, "documents/sample", {
      listing_id: listingId,
      kind,
    });
    expect(doc.status()).toBe(201);
    if (kind === "title") titleId = (await doc.json()).id;
  }
  expect(
    (
      await mutate(page, "asset/" + listingId, {
        action: "submit",
        mandate_confirmed: true,
      })
    ).status(),
  ).toBe(200);
  await login(page, demoAccounts.find((a) => a.role === "staff")!.id);
  expect(
    (
      await mutate(page, "asset/" + listingId, {
        action: "review",
        status: "approved",
        notes: "Demo evidence reviewed and publication approved.",
      })
    ).status(),
  ).toBe(200);
  await login(page, "demo-buyer-01");
  const offer = await mutate(page, "offers", {
    listing_id: listingId,
    amount: 95000,
    currency: "LSL",
    message: "Demo offer subject to title verification and managed closing.",
    consent: true,
  });
  expect(offer.status()).toBe(201);
  const offerId = (await offer.json()).id;
  expect((await page.request.get("/api/documents/" + titleId)).status()).toBe(
    404,
  );
  await login(page, "demo-owner-01");
  expect(
    (await mutate(page, "deal/" + offerId, { action: "accept" })).status(),
  ).toBe(200);
  expect(
    (
      await mutate(page, "deal/" + offerId, {
        action: "grant",
        document_id: titleId,
        confidentiality_confirmed: true,
      })
    ).status(),
  ).toBe(200);
  await login(page, "demo-buyer-01");
  const doc = await page.request.get("/api/documents/" + titleId);
  expect(doc.status()).toBe(200);
  expect((await doc.body()).toString()).toContain("DEMONSTRATION ONLY");
  expect(
    (
      await mutate(page, "deal/" + offerId, {
        action: "stage",
        stage: "Agreements",
        notes: "Demo buyer cannot advance this stage.",
      })
    ).status(),
  ).toBe(403);
  await login(page, "demo-buyer-02");
  expect((await page.request.get("/api/documents/" + titleId)).status()).toBe(
    404,
  );
  await login(page, demoSuperAdminId);
  for (const stage of [
    "Agreements",
    "Regulatory approvals",
    "Closing",
    "Completed",
  ]) {
    expect(
      (
        await mutate(page, "deal/" + offerId, {
          action: "stage",
          stage,
          notes: "Demo stage reviewed by Tafari and recorded for testing.",
        })
      ).status(),
    ).toBe(200);
  }
  const asset = await (
    await page.request.get("/api/platform/asset/" + listingId)
  ).json();
  expect(asset.listing.status).toBe("sold");
  const [audit] =
    await sql`SELECT count(*) FROM tafari_demo.audit_log WHERE entity_id=${offerId}`;
  expect(Number(audit.count)).toBeGreaterThan(5);
  const [liveCount] =
    await sql`SELECT count(*) FROM public.listings WHERE id=${listingId}`;
  expect(Number(liveCount.count)).toBe(0);
});
