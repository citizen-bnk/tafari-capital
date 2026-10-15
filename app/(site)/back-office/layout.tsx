import Link from "next/link";
import { redirect } from "next/navigation";
import { actor, admin, HttpError } from "@/lib/access";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tafari back office",
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const a = await actor();
    admin(a);
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) redirect("/auth/sign-in");
    return (
      <div className="wrap section">
        <div className="notice error">
          {e instanceof HttpError
            ? e.message
            : "The back office is temporarily unavailable."}
        </div>
        <Link className="btn dark" href="/dashboard">
          Open your workspace →
        </Link>
      </div>
    );
  }
  return <div className="wrap section">{children}</div>;
}
