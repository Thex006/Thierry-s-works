"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

const links = [
  { href: "#services-list", label: "Services" },
  { href: "#commercial", label: "Commercial" },
  { href: "#areas", label: "Areas" },
  { href: "#prices", label: "Prices" },
  { href: "#faq", label: "Questions" },
];

export function Logo() {
  return (
    <a href="#top" className="flex items-center gap-3" aria-label="Handyman in Columbus, back to top">
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#141414" />
        <rect x="14" y="27" width="36" height="10" rx="2" fill="#e2f03d" />
        <rect x="18" y="14" width="6" height="36" rx="2" fill="#e9e6df" />
        <rect x="40" y="14" width="6" height="36" rx="2" fill="#e9e6df" />
      </svg>
      <span className="title-3 tracking-tight">Handyman in Columbus</span>
    </a>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  // Mark the section in view as the current nav item.
  useEffect(() => {
    const ids = links.map((l) => l.href.slice(1));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-3 mt-3 grid grid-cols-[1fr_auto] items-center rounded-2xl bg-paper/75 backdrop-blur-xl hairline sm:mx-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="px-4 py-3">
          <Logo />
        </div>
        <nav aria-label="Main" className="hidden h-full lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              aria-current={active === l.href.slice(1) ? "true" : undefined}
              className="relative flex items-center border-l border-line px-4 title-4 text-graphite transition-colors duration-300 last:border-r hover:bg-card hover:text-ink aria-[current]:text-ink"
            >
              {l.label}
              <span className="absolute inset-x-4 bottom-0 h-0.5 origin-left scale-x-0 bg-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [[aria-current]>&]:scale-x-100" />
            </a>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-2 px-2 py-2">
          <span className="mr-2 hidden items-center gap-2 font-mono caption-4 text-muted xl:flex">
            <span className="pulse-dot size-2 rounded-full bg-[#1d9b4b]" /> Emergencies 24 h
          </span>
          <a href="#quote" className="btn btn-primary button-sm hidden sm:inline-flex">
            Request a quote
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative grid size-10 place-items-center rounded-xl hairline lg:hidden"
          >
            <span className={`absolute h-0.5 w-4 bg-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-45" : "-translate-y-1"}`} />
            <span className={`absolute h-0.5 w-4 bg-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "-rotate-45" : "translate-y-1"}`} />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`fixed inset-0 -z-10 bg-paper/95 backdrop-blur-2xl transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <nav aria-label="Mobile" className="flex h-full flex-col justify-center gap-2 px-6">
          {[...links, { href: "#quote", label: "Request a quote" }].map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b border-line py-4 heading-4 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transitionDelay: open ? `${Math.min(i * 60, 400)}ms` : "0ms", opacity: open ? 1 : 0, transform: open ? "none" : "translateY(24px)" }}
            >
              {l.label}
              <ArrowRight size={20} />
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
