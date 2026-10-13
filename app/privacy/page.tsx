export const metadata = { title: "Privacy notice" };
export default function Privacy() {
  return (
    <article className="wrap section prose narrow">
      <p className="eyebrow">Platform information</p>
      <h1>Privacy notice</h1>
      <p>Last updated: 12 October 2026.</p>
      <p>
        Tafari Capital (Pty) Ltd operates this website and Minerals Exchange.
        Contact phafanep@gmail.com about your personal information or this
        notice.
      </p>
      <h2>Information we use</h2>
      <p>
        We store account and contact details, asset submissions, uploaded
        evidence, buyer offers, deal conversations and records of platform
        actions. Our authentication service manages credentials and email
        verification; Tafari does not see your password.
      </p>
      <h2>Why we use it</h2>
      <p>
        We use this information to operate accounts, review listings, coordinate
        introductions and transactions, respond to enquiries, protect the
        platform and keep an accountable transaction record.
      </p>
      <h2>Who has access</h2>
      <p>
        Approved listing descriptions and commercial terms are visible to
        visitors. Supporting documents remain private to the uploader and Tafari
        staff unless the owner or Tafari explicitly grants access to a buyer.
        Tafari’s super administrator has access to the entire platform. Never
        put confidential information in a public listing description.
      </p>
      <h2>Cloud processing</h2>
      <p>
        The application runs on Vercel. Account and platform data are stored
        using Neon PostgreSQL in Frankfurt; uploaded documents use private
        Vercel Blob storage in Cape Town. These providers process information on
        Tafari’s behalf. Authentication email is delivered by the configured
        authentication provider. Cloud processing may involve transfers outside
        your country.
      </p>
      <h2>Your choices and retention</h2>
      <p>
        You can correct your profile and draft listings in your workspace and
        remove uploaded documents. Contact Tafari to request access, correction,
        account deletion or removal of other information. Tafari may retain
        transaction and audit records where necessary for an active transaction,
        disputes or applicable obligations. Records are not automatically
        deleted merely by signing out.
      </p>
      <h2>Cookies and security</h2>
      <p>
        Essential session cookies keep you signed in. The platform uses verified
        accounts, access checks and private document delivery. No optional
        advertising cookies are installed by this application.
      </p>
      <p>
        Only upload information you are authorized to share. Do not upload
        unnecessary identity documents, financial records or third-party
        personal information.
      </p>
    </article>
  );
}
