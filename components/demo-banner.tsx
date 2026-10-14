"use client";
import Link from "next/link";
import { useState } from "react";
import { useAppSession } from "@/components/app-session";
import { label } from "@/lib/types";
export function DemoBanner() {
  const { demo, leaveDemo } = useAppSession();
  const [error, setError] = useState("");
  if (!demo) return null;
  return (
    <aside className="demo-banner" aria-label="Demo session">
      <div className="wrap">
        <p>
          <strong>Demo workspace</strong> · {demo.name} · {label(demo.role)}
          <small>
            Fictional shared records. Real accounts, assets and files are
            isolated.
          </small>
          {error && <small role="alert">{error}</small>}
        </p>
        <div className="actions">
          <Link href="/auth/sign-in">Switch demo account</Link>
          <button
            onClick={async () => {
              try {
                await leaveDemo();
                window.location.assign("/auth/sign-in");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Leave demo
          </button>
        </div>
      </div>
    </aside>
  );
}
