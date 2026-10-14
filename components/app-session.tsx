"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
type SessionUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};
type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  verified: boolean;
};
type State = {
  data: { user: SessionUser } | null;
  demo: DemoUser | null;
  isPending: boolean;
  signOut: () => Promise<void>;
  leaveDemo: () => Promise<void>;
};
const SessionContext = createContext<State | null>(null);
export function AppSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const real = authClient.useSession();
  const [demo, setDemo] = useState<DemoUser | null>(null),
    [pending, setPending] = useState(true);
  useEffect(() => {
    let current = true;
    fetch("/api/demo", { cache: "no-store" })
      .then((r) => r.json())
      .then((result) => {
        if (current) setDemo(result.demo || null);
      })
      .catch(() => {})
      .finally(() => {
        if (current) setPending(false);
      });
    return () => {
      current = false;
    };
  }, []);
  async function leaveDemo() {
    const r = await fetch("/api/demo", { method: "DELETE" });
    if (!r.ok) throw new Error("Could not leave the demo. Please try again.");
    setDemo(null);
  }
  async function signOut() {
    await leaveDemo();
    // Signing out also clears a real session that may have preceded the demo.
    await authClient.signOut();
  }
  const data = demo
    ? {
        user: {
          id: demo.id,
          name: demo.name,
          email: demo.email,
          emailVerified: demo.verified,
        },
      }
    : real.data;
  return (
    <SessionContext.Provider
      value={{
        data,
        demo,
        isPending: pending || real.isPending,
        leaveDemo,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useAppSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("App session provider is required");
  return value;
}
