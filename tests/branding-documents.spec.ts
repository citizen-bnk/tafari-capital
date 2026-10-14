import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
import { demoAccounts } from "../lib/demo/accounts";
import { officePreview, wordType, sheetType } from "../lib/document-preview";
import { docxFixture, xlsxFixture } from "./file-fixtures";
const base = process.env.TEST_BASE_URL || "http://localhost:3100";
test("all demo organizations have distinct logos across selector, company records and assets", async ({
  page,
}) => {
  await page.goto("/auth/sign-in");
  await page.locator(".demo-selector summary").click();
  await expect(page.locator(".demo-account .company-logo")).toHaveCount(67);
  const paths = await page
    .locator(".demo-account .company-logo")
    .evaluateAll((images) => images.map((i) => i.getAttribute("src")));
  expect(new Set(paths).size).toBe(67);
  const assets = await Promise.all(
    demoAccounts.map(async (a) => {
      const r = await page.request.get(a.logo_url!);
      expect(r.status()).toBe(200);
      expect(r.headers()["content-type"]).toContain("image/svg+xml");
      return await r.text();
    }),
  );
  expect(new Set(assets).size).toBe(67);
  await page
    .getByLabel("Demo role", { exact: true })
    .selectOption("super_admin");
  await page
    .getByRole("button", { name: "Try Tafari Demo Back Office", exact: true })
    .click();
  await page
    .locator(".admin-sidebar")
    .getByRole("link", { name: "Users & permissions", exact: true })
    .click();
  await expect(page.locator(".admin-content .company-logo")).toHaveCount(50);
  const users = await (
    await page.request.get("/api/platform/admin?tab=users")
  ).json();
  expect(
    users.users.every((u: { logo_url: string }) =>
      u.logo_url.startsWith("/demo-logos/"),
    ),
  ).toBe(true);
  await page.goto("/exchange");
  await expect(page.locator(".asset-card .company-logo")).toHaveCount(25);
  await page.screenshot({
    path: "../../outputs/tafari-demo-company-logos.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/sign-in");
  await page.locator(".demo-selector summary").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("private PDF viewer renders inside the application and respects grants for all view modes", async ({
  page,
}) => {
  expect(
    (
      await page.request.post("/api/demo", {
        headers: { origin: base },
        data: { id: "demo-owner-06" },
      })
    ).status(),
  ).toBe(200);
  const dashboard = await (
    await page.request.get("/api/platform/dashboard")
  ).json();
  const listingId = dashboard.listings[0].id;
  const asset = await (
    await page.request.get("/api/platform/asset/" + listingId)
  ).json();
  const document = asset.documents.find(
    (d: { kind: string; state: string }) =>
      d.kind === "title" && d.state === "ready",
  );
  await page.goto("/dashboard/listings/" + listingId);
  await page
    .locator(".file-row")
    .filter({ hasText: document.name })
    .getByRole("link", { name: "View", exact: false })
    .click();
  await expect(page).toHaveURL(
    new RegExp("/dashboard/documents/" + document.id),
  );
  await expect(page.locator("canvas[data-rendered=true]")).toBeVisible({
    timeout: 20000,
  });
  await page.locator(".pdf-page-text summary").click();
  await expect(page.locator(".pdf-page-text")).toContainText(
    "DEMONSTRATION ONLY",
  );
  await expect(
    page.getByRole("link", { name: "Download original", exact: false }),
  ).toBeVisible();
  const inline = await page.request.get(
    `/api/documents/${document.id}?mode=inline`,
  );
  expect(inline.status()).toBe(200);
  expect(inline.headers()["content-disposition"]).toContain("inline");
  expect(
    (await page.request.get(`/api/documents/${document.id}`)).headers()[
      "content-disposition"
    ],
  ).toContain("attachment");
  await page.screenshot({
    path: "../../outputs/tafari-document-preview.png",
    fullPage: true,
  });
  expect(
    (
      await page.request.post("/api/demo", {
        headers: { origin: base },
        data: { id: "demo-buyer-06" },
      })
    ).status(),
  ).toBe(200);
  const shared = await page.request.get(
    `/api/documents/${document.id}?mode=metadata`,
  );
  expect(shared.status()).toBe(200);
  expect((await shared.json()).document.can_manage).toBe(false);
  expect(
    (
      await page.request.post("/api/demo", {
        headers: { origin: base },
        data: { id: "demo-buyer-07" },
      })
    ).status(),
  ).toBe(200);
  for (const mode of ["metadata", "inline", "preview"])
    expect(
      (
        await page.request.get(`/api/documents/${document.id}?mode=${mode}`)
      ).status(),
    ).toBe(404);
});
test("Office preview preserves text, worksheet values and paging and rejects entity expansion", () => {
  const word = officePreview(docxFixture, wordType);
  expect(word.kind).toBe("word");
  if (word.kind === "word")
    expect(word.paragraphs).toEqual([
      "Private asset brief & terms",
      "Evidence remains in Tafari.",
    ]);
  const first = officePreview(xlsxFixture, sheetType);
  expect(first.kind).toBe("spreadsheet");
  if (first.kind === "spreadsheet") {
    expect(first.sheets).toEqual(["Valuation", "Assays"]);
    expect(first.rows[0].cells).toEqual(["Asset value", "1000"]);
    expect(first.rows).toHaveLength(100);
  }
  const next = officePreview(xlsxFixture, sheetType, 0, 1);
  if (next.kind === "spreadsheet") {
    expect(next.rows).toHaveLength(1);
    expect(next.rows[0].number).toBe(101);
  }
  const second = officePreview(xlsxFixture, sheetType, 1);
  if (second.kind === "spreadsheet")
    expect(second.rows[0].cells).toEqual(["Gold assay", "3.75"]);
  const invalid = zipSync({
    "word/document.xml": strToU8(
      '<!DOCTYPE x [<!ENTITY attack "bad">]><document><p>&attack;</p></document>',
    ),
  });
  expect(() => officePreview(invalid, wordType)).toThrow(/entity declarations/);
  const breaks = officePreview(
    zipSync({
      "word/document.xml": strToU8(
        "<document><p><r><t>First</t><br/><t>Second</t><tab/><t>Third</t></r></p></document>",
      ),
    }),
    wordType,
  );
  if (breaks.kind === "word")
    expect(breaks.paragraphs).toEqual(["First\nSecond\tThird"]);
});
