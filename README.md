# Tafari Capital

Website for **Tafari Capital (Pty) Ltd** and the **Tafari Minerals Exchange** prototype.

| Path | What it is |
|---|---|
| `index.html` | Company website: services, the Exchange, how we work, about, contact |
| `exchange/index.html` | Tafari Minerals Exchange: listings and verification, buyers and deal room, tokenization, partners, offtake and logistics, integrations |
| `assets/` | Lion mark, Generational Sovereignty seal, favicon |

Both are static HTML, CSS and JavaScript with no build step.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish

Any static host works (GitHub Pages, Netlify, Cloudflare Pages, or the existing web host).
For GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / root**.
GitHub Pages on a private repository needs a paid GitHub plan.

## The Exchange: data storage

The Exchange keeps its records through a small Firestore-style data layer
(`collection().onSnapshot`, `doc().set / update / delete`).

- **On claude.ai** it uses the shared artifact database, so the Tafari team works on one register.
- **Anywhere else** (this repository, GitHub Pages) it runs in **demo mode** and saves to the
  browser's local storage only. Nothing is shared between people or devices.

Before owners, buyers or staff use it in production, replace `makeLocalDB()` in
`exchange/index.html` with a hosted backend (for example Firebase/Firestore or Supabase)
and add sign-in with roles for Tafari staff, owners, buyers and partners. The rest of the
application code does not need to change.

## Still to do before going live

- Confirm the contact email and phone in `index.html` (currently the founder's details).
- Connect a shared database and user accounts for the Exchange.
- Legal review of the website disclaimer and the tokenization wording (FSCA, Central Bank of Lesotho, MPRDA s11).
- POPIA and Lesotho Data Protection Act 2011 privacy notice before collecting owner or buyer data.
