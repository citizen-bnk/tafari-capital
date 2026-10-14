"use client";
import { useState } from "react";
import { demoAccounts, demoRoles } from "@/lib/demo/accounts";
import { ErrorBox } from "@/components/ui";
import { label } from "@/lib/types";
import { CompanyIdentity } from "@/components/company-identity";
export function DemoSelector() {
  const [role, setRole] = useState("all"),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const filtered = demoAccounts.filter(
    (a) =>
      (role === "all" || a.role === role) &&
      `${a.name} ${a.company} ${a.organizationType} ${a.scenario}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function login(id: string, role: string) {
    setBusy(id);
    setError("");
    try {
      const r = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || "Demo sign-in failed.");
      // Reload to discard data cached under the previous identity.
      window.location.assign(
        ["staff", "super_admin"].includes(role) ? "/back-office" : "/dashboard",
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }
  return (
    <details className="demo-selector">
      <summary>
        Explore with a demo account <span>Choose a role →</span>
      </summary>
      <p>
        One-click access to fictional records: 20 buyers, 40 sellers and every
        platform role. Demo changes are shared with other visitors. Use your own
        account for real work.
      </p>
      <div className="demo-filters">
        <label>
          Demo role
          <select
            aria-label="Demo role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="all">All roles</option>
            {demoRoles.map((r) => (
              <option key={r} value={r}>
                {label(r)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Find a demo account
          <input
            aria-label="Find a demo account"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Company, name or scenario"
            maxLength={120}
          />
        </label>
      </div>
      <ErrorBox message={error} />
      <p className="muted">
        {filtered.length} demo accounts · Fictional organizations and synthetic
        documents · No password needed
      </p>
      <div className="demo-accounts" aria-label="Demo accounts">
        {filtered.map((a) => (
          <article className="demo-account" key={a.id}>
            <div>
              <CompanyIdentity id={a.id} company={a.company} />
              <small>
                {a.name} · {label(a.role)}
              </small>
              <small>
                {a.organizationType} · {a.country}
              </small>
              <p>{a.scenario}</p>
              {a.status !== "active" && (
                <small className="demo-status">
                  Suspended account scenario
                </small>
              )}
              {!a.verified && (
                <small className="demo-status">Unverified email scenario</small>
              )}
            </div>
            <button
              className="btn outline small"
              disabled={!!busy}
              onClick={() => login(a.id, a.role)}
              aria-label={`Try ${a.company}`}
            >
              {busy === a.id ? "Opening…" : "Try account →"}
            </button>
          </article>
        ))}
        {!filtered.length && <p>No demo accounts match this search.</p>}
      </div>
    </details>
  );
}
