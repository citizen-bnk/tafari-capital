"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function QuickMenu({
  services,
}: {
  services: { slug: string; title: string }[];
}) {
  const path = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = openPath === path;
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpenPath(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPath(null);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/back-office") ||
    path.startsWith("/auth")
  )
    return null;
  return (
    <div
      className="quick-menu"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setOpenPath(null);
      }}
    >
      <button
        className="btn dark quick-menu-trigger"
        ref={trigger}
        aria-expanded={open}
        aria-controls="quick-menu-links"
        onClick={() => setOpenPath(open ? null : path)}
      >
        {open ? <X size={18} /> : <Compass size={18} />} Quick menu
      </button>
      <nav id="quick-menu-links" aria-label="Quick menu" hidden={!open}>
        <p className="eyebrow">Where would you like to go?</p>
        <Link href="/submit-asset" onClick={() => setOpenPath(null)}>
          Submit your asset ↗
        </Link>
        <Link href="/exchange" onClick={() => setOpenPath(null)}>
          Browse the Exchange ↗
        </Link>
        {services.map((service) => (
          <Link
            href={`/services/${service.slug}`}
            key={service.slug}
            onClick={() => setOpenPath(null)}
          >
            {service.title} ↗
          </Link>
        ))}
        <Link href="/guides/asset-owners" onClick={() => setOpenPath(null)}>
          Owner guide ↗
        </Link>
        <Link href="/guides/buyers" onClick={() => setOpenPath(null)}>
          Buyer guide ↗
        </Link>
        <Link href="/faq" onClick={() => setOpenPath(null)}>
          Questions & answers ↗
        </Link>
        <Link href="/contact" onClick={() => setOpenPath(null)}>
          Contact the team ↗
        </Link>
      </nav>
    </div>
  );
}
