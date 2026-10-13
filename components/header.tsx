"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";
const links = [
  ["/", "Home"],
  ["/services", "Services"],
  ["/distribution", "Products"],
  ["/exchange", "Exchange"],
  ["/how-it-works", "How it works"],
  ["/about", "About"],
  ["/contact", "Contact"],
];
export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname(),
    router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            <img src="/assets/lion.png" alt="" />
            <span>
              TAFARI CAPITAL<small>GENERATIONAL SOVEREIGNTY</small>
            </span>
          </Link>
          <button
            className="mobile-menu"
            aria-expanded={open}
            aria-controls="main-menu"
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav
            id="main-menu"
            className={open ? "nav open" : "nav"}
            aria-label="Main menu"
          >
            {links.map(([href, title]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {title}
              </Link>
            ))}
            {session ? (
              <>
                <Link
                  className="btn small gold"
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                >
                  My workspace <ArrowUpRight size={15} />
                </Link>
                <button
                  className="nav-signout"
                  onClick={async () => {
                    await authClient.signOut();
                    setOpen(false);
                    router.push("/");
                    router.refresh();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                className="btn small gold"
                href="/auth/sign-in"
                onClick={() => setOpen(false)}
              >
                {isPending ? "Account" : "Sign in"} <ArrowUpRight size={15} />
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
