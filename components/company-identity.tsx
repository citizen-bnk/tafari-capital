import { demoAccounts } from "@/lib/demo/accounts";
const byId = new Map(demoAccounts.map((a) => [a.id, a]));
const byEmail = new Map(demoAccounts.map((a) => [a.email, a]));
export function CompanyIdentity({
  id,
  email,
  company,
}: {
  id?: string;
  email?: string;
  company?: string;
}) {
  const account = id ? byId.get(id) : email ? byEmail.get(email) : undefined;
  const name = company || account?.company;
  if (!name) return null;
  return (
    <span className="company-identity">
      {account?.logo_url && (
        <img
          className="company-logo"
          src={account.logo_url}
          alt={`${name} demo logo`}
          width={40}
          height={40}
          loading="lazy"
        />
      )}
      <span className="company-name">{name}</span>
    </span>
  );
}
