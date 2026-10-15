"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function WorkspaceNav() {
  const path = usePathname();
  return (
    <nav className="workspace-nav" aria-label="Workspace menu">
      {[
        ["/dashboard", "Overview"],
        ["/dashboard/applications", "Asset applications"],
        ["/dashboard/listings", "My assets"],
        ["/dashboard/offers", "Offers & deals"],
        ["/dashboard/listings/new", "List an asset"],
        ["/dashboard/profile", "My profile"],
        ["/back-office", "Tafari back office"],
      ].map(([href, text]) => (
        <Link className={path === href ? "active" : ""} key={href} href={href}>
          {text}
        </Link>
      ))}
    </nav>
  );
}
