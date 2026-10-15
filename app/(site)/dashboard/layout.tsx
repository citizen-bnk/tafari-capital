import { redirect } from "next/navigation";
import { actor, HttpError } from "@/lib/access";
import { WorkspaceNav } from "@/components/workspace-nav";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your workspace",
  robots: { index: false, follow: false },
};
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await actor(false);
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) redirect("/auth/sign-in");
    return (
      <div className="wrap section">
        <div className="notice error">
          {e instanceof HttpError
            ? e.message
            : "Your workspace is temporarily unavailable."}
        </div>
      </div>
    );
  }
  return (
    <div className="wrap section">
      <WorkspaceNav />
      {children}
    </div>
  );
}
