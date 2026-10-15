import { test, expect, type APIRequestContext } from "@playwright/test";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import {
  activeQuestions,
  nextQuestion,
  parseAnswer,
  questions,
  rewindAnswers,
  validateContact,
  type Answers,
  type AssetApplication,
} from "../lib/intake/questions";
config({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL!);
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
const created: { id: string; demo: boolean }[] = [];
const contact: Answers = {
  contact_name: "Disposable Intake Test",
  contact_preference: "Phone call",
  contact_phone: "+266 5800 0099",
  contact_consent: "Yes, please contact me",
};
async function patch(
  request: APIRequestContext,
  application: AssetApplication,
  extra: Record<string, unknown>,
) {
  return request.patch("/api/intake", {
    headers: { origin: base },
    data: { revision: application.revision, ...extra },
  });
}
test.afterAll(async () => {
  for (const fixture of created) {
    // Exact IDs created by this test only; never remove seeded or customer records.
    const schema = fixture.demo ? "tafari_demo" : "public";
    await sql.transaction([
      sql.query(
        `UPDATE ${schema}.asset_applications SET listing_id=NULL WHERE id=$1`,
        [fixture.id],
      ),
      sql.query(
        `DELETE FROM ${schema}.audit_log WHERE entity='application' AND entity_id=$1`,
        [fixture.id],
      ),
      sql.query(`DELETE FROM ${schema}.listings WHERE application_id=$1`, [
        fixture.id,
      ]),
      sql.query(`DELETE FROM ${schema}.asset_applications WHERE id=$1`, [
        fixture.id,
      ]),
    ]);
  }
});
test("standalone visual funnel has no website navigation and keeps the current question focused", async ({
  page,
}) => {
  await page.goto("/submit-asset?utm_source=marketing");
  await expect(
    page.getByRole("textbox", { name: "What is your full name?" }),
  ).toBeVisible();
  await expect(
    page.locator(".site-header, footer, .nav, .demo-banner"),
  ).toHaveCount(0);
  await expect(page.locator(".funnel-illustration")).toBeVisible();
  await expect(page.locator(".intake-chat h2")).toHaveCount(1);
  await expect(page).toHaveTitle("Submit your mining asset");
  await page.screenshot({
    path: "../../outputs/tafari-asset-funnel-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../../outputs/tafari-asset-funnel-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Main menu" }),
  ).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
});
test("question engine handles contact consent, branching, optional answers and safe edits", () => {
  expect(validateContact(contact).contact_phone).toBe("+26658000099");
  expect(() =>
    validateContact({ ...contact, contact_consent: "Not now" }),
  ).toThrow();
  expect(() =>
    parseAnswer(
      questions.find((q) => q.id === "contact_phone")!,
      "58000099",
    ),
  ).toThrow(/country code/);
  const a = {
    ...contact,
    contact_preference: "Email",
    contact_email: " TEST@example.org ",
  };
  expect(validateContact(a).contact_email).toBe("test@example.org");
  expect(activeQuestions(a).some((q) => q.id === "contact_phone")).toBe(false);
  expect(
    activeQuestions({ ...a, country: "Other" }).some(
      (q) => q.id === "other_country",
    ),
  ).toBe(true);
  expect(
    activeQuestions({ ...a, asking_price: "" }).some(
      (q) => q.id === "currency",
    ),
  ).toBe(false);
  expect(
    parseAnswer(
      questions.find((q) => q.id === "asking_price")!,
      "12,000",
    ),
  ).toBe("12000");
  expect(() =>
    parseAnswer(
      questions.find((q) => q.id === "description")!,
      "short",
    ),
  ).toThrow();
  expect(
    rewindAnswers(
      { ...contact, company: "Test", relationship: "I own the asset" },
      "company",
    ),
  ).toEqual(contact);
});
test("unverified applicants can start privately but cannot claim or create a listing", async ({
  page,
  browser,
}) => {
  await page.request.post("/api/demo", {
    headers: { origin: base },
    data: { id: "demo-unverified-buyer" },
  });
  const declined = await page.request.post("/api/intake", {
    headers: { origin: base },
    data: { answers: { ...contact, contact_consent: "Not now" } },
  });
  expect(declined.status()).toBe(400);
  expect(
    (await (await page.request.get("/api/intake")).json()).application,
  ).toBeNull();
  const start = await page.request.post("/api/intake", {
    headers: { origin: base },
    data: { answers: contact },
  });
  expect(start.status()).toBe(201);
  const app = (await start.json()).application as AssetApplication;
  created.push({ id: app.id, demo: true });
  expect((await patch(page.request, app, { action: "claim" })).status()).toBe(
    403,
  );
  expect(
    (
      await patch(page.request, app, {
        action: "draft",
        transaction_type: "Full sale",
      })
    ).status(),
  ).toBe(403);
  const other = await browser.newContext();
  try {
    await other.request.post(base + "/api/demo", {
      headers: { origin: base },
      data: { id: "demo-owner-04" },
    });
    expect(
      (
        await other.request.get(base + "/api/applications?id=" + app.id)
      ).status(),
    ).toBe(404);
    expect(
      (
        await other.request.post(base + "/api/applications", {
          headers: { origin: base },
          data: { id: app.id, revision: app.revision, action: "resume" },
        })
      ).status(),
    ).toBe(404);
  } finally {
    await other.close();
  }
});
test("guest contact-first chat saves, resumes and supports private staff follow-up", async ({
  page,
  browser,
}) => {
  await page.goto("/submit-asset");
  await page
    .getByRole("textbox", { name: "What is your full name?" })
    .fill(contact.contact_name);
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page.getByRole("button", { name: "Phone call", exact: true }).click();
  await page
    .getByRole("textbox", {
      name: "What is the best phone number to reach you?",
    })
    .fill("5800");
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await expect(page.locator(".intake-chat [role=alert]")).toContainText(
    "country code",
  );
  await page
    .getByRole("textbox", {
      name: "What is the best phone number to reach you?",
    })
    .fill(contact.contact_phone);
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  expect(
    (await (await page.request.get("/api/intake")).json()).application,
  ).toBeNull();
  await page
    .getByRole("button", { name: "Yes, please contact me", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What is your company name?" }),
  ).toBeVisible();
  let app = (await (await page.request.get("/api/intake")).json())
    .application as AssetApplication;
  created.push({ id: app.id, demo: false });
  expect(app.contact_phone).toBe("+26658000099");
  expect(app).not.toHaveProperty("resume_hash");
  expect(app).not.toHaveProperty("staff_notes");
  expect(
    (await page.context().cookies()).find((c) => c.name === "tafari_intake")
      ?.httpOnly,
  ).toBe(true);
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "What is your connection to the asset?",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "What is your connection to the asset?",
    }),
  ).toBeVisible();
  app = (await (await page.request.get("/api/intake")).json()).application;
  expect(
    (
      await patch(page.request, app, {
        action: "answer",
        question: "country",
        value: "Lesotho",
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await patch(
        page.request,
        { ...app, revision: app.revision - 1 },
        {
          action: "answer",
          question: "relationship",
          value: "I own the asset",
        },
      )
    ).status(),
  ).toBe(409);
  const changed = await patch(page.request, app, {
    action: "contact",
    answers: { ...contact, contact_phone: "+26658000100" },
  });
  expect(changed.status()).toBe(200);
  app = (await changed.json()).application;
  expect(app.answers.company).toBe("");
  expect(app.contact_phone).toBe("+26658000100");
  const other = await browser.newContext();
  try {
    expect(
      (await (await other.request.get(base + "/api/intake")).json())
        .application,
    ).toBeNull();
    expect(
      (
        await other.request.get(base + "/api/applications?id=" + app.id)
      ).status(),
    ).toBe(401);
    expect(
      (
        await other.request.patch(base + "/api/intake", {
          headers: { origin: base },
          data: { action: "submit", revision: app.revision },
        })
      ).status(),
    ).toBe(404);
  } finally {
    await other.close();
  }
  expect(
    (
      await page.request.patch("/api/intake", {
        headers: { origin: "https://unrelated.example" },
        data: { action: "submit", revision: app.revision },
      })
    ).status(),
  ).toBe(403);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "What is your connection to the asset?",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "../../outputs/tafari-guided-intake-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("demo owner completes questionnaire, prepares one private draft and staff reviews with isolation", async ({
  page,
  browser,
}) => {
  expect(
    (
      await page.request.post("/api/demo", {
        headers: { origin: base },
        data: { id: "demo-owner-03" },
      })
    ).status(),
  ).toBe(200);
  const start = await page.request.post("/api/intake", {
    headers: { origin: base },
    data: { answers: contact },
  });
  expect(start.status()).toBe(201);
  let app = (await start.json()).application as AssetApplication;
  created.push({ id: app.id, demo: true });
  const values: Answers = {
    company: "Test Guided Mining",
    relationship: "I own the asset",
    asset_type: "Mining asset",
    asset_name: "Test Guided Gold Asset",
    country: "Other",
    other_country: "Botswana",
    location: "Test district",
    commodity: "Other",
    other_commodity: "Copper",
    development_stage: "Not sure",
    transaction_goal: "I need advice",
    description:
      "A disposable fictional asset used to verify the full private submission flow.",
    right_status: "Not sure",
    right_reference: "",
    asking_price: "",
    area_hectares: "",
    documents_ready: "Not yet",
  };
  for (let q = nextQuestion(app.answers); q; q = nextQuestion(app.answers)) {
    const response = await patch(page.request, app, {
      action: "answer",
      question: q.id,
      value: values[q.id],
    });
    expect(response.status(), q.id + ": " + (await response.text())).toBe(200);
    app = (await response.json()).application;
  }
  await page.goto("/submit-asset");
  await page
    .getByRole("button", { name: "Send application to Tafari", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thank you, Disposable." }),
  ).toBeVisible();
  app = (await (await page.request.get("/api/intake")).json()).application;
  expect(app.state).toBe("submitted");
  expect(
    (
      await patch(page.request, app, {
        action: "answer",
        question: "company",
        value: "Edit after submit",
      })
    ).status(),
  ).toBe(409);
  expect((await patch(page.request, app, { action: "draft" })).status()).toBe(
    400,
  );
  const draft = await patch(page.request, app, {
    action: "draft",
    transaction_type: "Joint venture",
  });
  expect(draft.status(), await draft.text()).toBe(200);
  const { id } = await draft.json();
  expect(
    (
      await (
        await patch(page.request, app, {
          action: "draft",
          transaction_type: "Joint venture",
        })
      ).json()
    ).id,
  ).toBe(id);
  const asset = (
    await (await page.request.get("/api/platform/asset/" + id)).json()
  ).listing;
  expect(asset.status).toBe("draft");
  expect(asset.application_id).toBe(app.id);
  expect(asset.description).not.toContain(contact.contact_name);
  expect(asset.description).toContain("Botswana");
  expect(
    (await page.request.get("/api/platform/listings/" + id)).status(),
  ).toBe(404);
  expect(
    (await sql`SELECT id FROM public.asset_applications WHERE id=${app.id}`)
      .length,
  ).toBe(0);
  await page.goto("/dashboard/applications/" + app.id);
  await expect(page.getByText(app.reference, { exact: true })).toBeVisible();
  expect(
    (
      await page.request.post("/api/applications", {
        headers: { origin: base },
        data: {
          id: app.id,
          revision: app.revision,
          action: "review",
          status: "closed",
        },
      })
    ).status(),
  ).toBe(403);
  const staff = await browser.newContext();
  try {
    await staff.request.post(base + "/api/demo", {
      headers: { origin: base },
      data: { id: "demo-role-super_admin-5" },
    });
    app = (
      await (
        await staff.request.get(base + "/api/applications?id=" + app.id)
      ).json()
    ).application;
    const review = await staff.request.post(base + "/api/applications", {
      headers: { origin: base },
      data: {
        id: app.id,
        revision: app.revision,
        action: "review",
        status: "contacted",
        staff_notes: "Private follow-up test.",
      },
    });
    expect(review.status()).toBe(200);
    expect((await review.json()).application.staff_notes).toBe(
      "Private follow-up test.",
    );
    const staffPage = await staff.newPage();
    await staffPage.goto(base + "/back-office");
    await staffPage
      .getByRole("link", { name: /^View new applications:/ })
      .click();
    await expect(staffPage).toHaveURL(/applications\?status=new/);
    await expect(
      staffPage.getByRole("combobox", { name: "Status filter", exact: true }),
    ).toHaveValue("new");
  } finally {
    await staff.close();
  }
  const ownerView = (
    await (await page.request.get("/api/applications?id=" + app.id)).json()
  ).application;
  expect(ownerView.status).toBe("contacted");
  expect(ownerView).not.toHaveProperty("staff_notes");
  const resume = await page.request.post("/api/applications", {
    headers: { origin: base },
    data: { id: app.id, revision: ownerView.revision, action: "resume" },
  });
  expect(resume.status()).toBe(200);
});
