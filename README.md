# Tafari Capital

Multi-page company website, Minerals Exchange and Tafari back office.

## Stack

- Next.js 16.4 App Router, React 19.3 and TypeScript.
- Neon PostgreSQL and managed Neon Auth: email/password, verification codes and recovery.
- Private Vercel Blob storage, direct browser uploads and authorized downloads.
- Zod server validation and Playwright workflow/authorization tests.
- Exact dependency versions and a lockfile for repeatable builds.

## Pages

Public: `/`, `/services`, `/about`, `/how-it-works`, `/contact`, `/exchange`, `/exchange/:id`, `/privacy`, `/terms`.

Accounts: `/auth/sign-up`, `/auth/sign-in`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`.

Workspace: `/dashboard`, `/dashboard/profile`, `/dashboard/listings/new`, `/dashboard/listings/:id`, `/dashboard/deals/:id`.

Administration: `/back-office` with asset review, transactions, users, documents, enquiries and audit history. Records support search and pagination.

## Owner-to-sale workflow

1. Participants register and verify email. Unverified users can view their workspace but cannot submit listings, offers or documents.
2. An owner creates a draft, uploads title/right evidence and a signed mandate, confirms authority and submits for review.
3. Tafari inspects the evidence and approves publication, requests changes or withdraws the listing.
4. Buyers submit offers. An owner or Tafari accepts one offer, reserving the asset and declining remaining pending offers.
5. Participants discuss the transaction in a private deal room. Owners and staff explicitly grant/revoke individual document access after confidentiality agreements are in place.
6. Tafari records diligence, agreements, regulatory approvals, closing and completion. Only Tafari can mark a sale completed. Acceptance does not transfer ownership or collect payment.

There are no seeded business records or browser-local data fallbacks.

## Super administrator

`phafanep@gmail.com` is the designated super administrator, with access to all listings, deals, documents, enquiries and audit records, plus staff-role assignment and participant suspension. This privilege requires a valid session and the authentication provider's verified email. The user chooses their password during registration/recovery. No administrator password is stored in source.

The designated super administrator cannot be demoted or suspended through the application. Staff can operate the deal desk but cannot change user permissions. Every private API checks authentication, email verification, suspension and resource ownership independently of the interface.

## Local setup

Use Node.js 22 or 24 and npm. Link the existing `smart-my-co/tafari-capital` Vercel project; do not create another database or store.

```sh
npm ci
vercel link --scope smart-my-co --project tafari-capital
vercel env pull .env.local --scope smart-my-co
```

Required keys are in `.env.example`. Generate a separate local `NEON_AUTH_COOKIE_SECRET` if a secret cannot be pulled. Never print or commit credentials. `SUPER_ADMIN_EMAIL` defaults to the address above.

```sh
npm run db:migrate
npm run dev
npm run build
npm run typecheck
```

Migration `migrations/001_platform.sql` is versioned and applied atomically using the direct/unpooled connection. Test future migrations on an isolated database branch before applying them to production.

## Tests

```sh
npx playwright install chromium
npm test
```

The suite uses disposable accounts/assets, uploads tiny files to the real private store, tests cross-user access and completes a managed sale. Cleanup removes only those fixtures. For ongoing CI, use an isolated database and Blob store; do not run against existing production business data.

The local test server temporarily designates a disposable fixture as super administrator. Production defaults to `phafanep@gmail.com`. Disposable users are verified through the database to avoid reading a mailbox; real email delivery must be tested separately before launch. Credential traces/screenshots are disabled.

## Private files

Allowed: PDF, JPEG, PNG, WEBP, DOCX, XLSX; 20 MB per file, up to 30 files per asset. Files are private. Authorized downloads use attachment disposition and `no-store`. Upload tokens are scoped to one new pathname, allowed type/size and a short expiry based on the storage service clock. Final metadata is checked before a document becomes ready.

## Production setup

`vercel.json` defines the Next.js build. Resources exist in the Smart My Company team:

- `tafari-capital-db`: Neon PostgreSQL and managed authentication, Frankfurt.
- `tafari-capital-documents`: private Vercel Blob storage, Cape Town.
- Proposed email domain: `tafaricapital.co.ls`.

Resend's Marketplace free resource plan is disabled; no paid plan was purchased. The user chose the separate free-account path, and `tafaricapital.co.ls` has been added in the existing Resend account. The domain is not registered yet. Its DNS verification and custom SMTP remain pending registration. Verify the sender DNS and connect Resend SMTP to Neon Auth before public rollout. Shared Neon SMTP is for setup; test real verification and password-recovery delivery with the final sender.

The exact production origins `https://tafari-capital.vercel.app` and `https://tafari-capital-smart-my-co.vercel.app`, plus the verified staged deployment origin, are saved in Neon Auth's trusted-domain list. Authentication branding is Tafari Capital. Live registration succeeds, and private APIs reject anonymous requests. Verify actual mailbox delivery before public rollout. Configure the custom domain and DNS after registration; the `.vercel.app` origin works independently.

## Published release

The application is live at [tafari-capital.vercel.app](https://tafari-capital.vercel.app/). [PR #1](https://github.com/citizen-bnk/tafari-capital/pull/1) is merged into `main`. The verified production application build is `05bb9ab`; subsequent documentation changes do not change that build.

Vercel's GitHub integration is not connected; use authenticated CLI releases until it is. Stage a production build, verify, then promote:

```sh
vercel deploy --prod --skip-domain --scope smart-my-co
vercel promote <verified-deployment-url> --scope smart-my-co
```

Enquiries are stored in the back office. Sale notification emails are not silently sent before a verified mail provider is connected. Review the privacy notice, platform terms and transaction documents with Tafari before inviting participants; keep restore retention and cloud usage limits appropriate to the business.
