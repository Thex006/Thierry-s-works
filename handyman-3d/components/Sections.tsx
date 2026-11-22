"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, CheckCircle, MapPin, Plus, ShieldCheck, Siren, Handshake } from "@phosphor-icons/react/dist/ssr";
import { areas, business, faqs, hours, neighbourhoods, prices, proof, services, tagline } from "@/lib/content";
import { Logo } from "./Nav";

/** Rise and fade once, on first view. */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Eyebrow({ no, children }: { no: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono caption-4 text-muted">
      <span className="rounded-md bg-ink px-2 py-1 text-paper">{no}</span>
      {children}
    </p>
  );
}

function ServicesIndex() {
  return (
    <section id="services-list" className="mx-auto max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
      <div className="reveal grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Eyebrow no="A">Services</Eyebrow>
          <h2 className="mt-6 heading-3 sm:heading-2">
            Repairs we handle,
            <br />
            inside and out
          </h2>
          <p className="mt-6 max-w-[420px] body-3 text-graphite">
            One call for most of the house. Tell us what broke and where, and the crew brings the right tools for the whole list.
          </p>
        </div>
        <ol className="overflow-hidden rounded-3xl bg-card hairline">
          {services.map((s) => (
            <li key={s.id} className="group border-b border-line last:border-b-0">
              <a href="#quote" className="grid grid-cols-[48px_1fr_auto] items-center gap-4 p-6 transition-colors duration-300 hover:bg-hivis sm:grid-cols-[64px_1fr_160px_auto]">
                <span className="font-mono caption-3 text-muted group-hover:text-ink">{s.no}</span>
                <span>
                  <span className="block title-2">{s.title}</span>
                  <span className="mt-1 block body-6 text-muted group-hover:text-graphite">{s.short}</span>
                </span>
                <span className="hidden font-mono caption-4 text-muted sm:block">{s.group}</span>
                <ArrowUpRight size={20} className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:translate-x-1" />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Commercial() {
  const icons = [Handshake, ShieldCheck, Siren];
  return (
    <section id="commercial" className="bg-ink text-paper">
      <div className="mx-auto max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
        <div className="reveal grid gap-12 lg:grid-cols-2">
          <div>
            <p className="flex items-center gap-3 font-mono caption-4 text-paper/60">
              <span className="rounded-md bg-hivis px-2 py-1 text-ink">B</span>
              Commercial
            </p>
            <h2 className="mt-6 heading-3 sm:heading-2">
              Maintenance for
              <br />
              commercial properties
            </h2>
          </div>
          <p className="self-end title-2 font-normal text-paper/80">
            Facilities maintenance for offices and commercial sites, plus repairs on HUD (federal housing) properties. Same crew, same tools, a certificate of insurance when your company asks for one.
          </p>
        </div>
        <div className="reveal mt-16 grid gap-4 sm:grid-cols-3">
          {proof.map((p, i) => {
            const Icon = icons[i];
            return (
              <div key={p.label} className="rounded-3xl border border-white/15 p-6 transition-colors duration-300 hover:bg-white/5">
                <Icon size={28} weight="duotone" className="text-hivis" />
                <p className="mt-12 font-mono caption-4 text-paper/60">{p.label}</p>
                <p className="mt-2 heading-6">{p.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Tagline() {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = tagline.split(" ");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.querySelectorAll<HTMLSpanElement>(".word"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      spans.forEach((s) => s.classList.add("on"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle("on", e.isIntersecting || e.boundingClientRect.top < 0);
      },
      { rootMargin: "0px 0px -42% 0px" },
    );
    spans.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  return (
    <section aria-label="How we work" className="mx-auto max-w-[1280px] px-4 py-32 sm:px-8 lg:py-48">
      <p className="font-mono caption-4 text-muted">How we work</p>
      <p ref={ref} className="mt-8 max-w-[1000px] heading-3 sm:heading-1">
        {words.map((w, i) => (
          <span key={i} className={`word ${i >= words.length - 2 ? "mark" : ""}`}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
    </section>
  );
}

function Areas() {
  return (
    <section id="areas" className="relative">
      <div className="relative h-[90svh] min-h-[640px] w-full overflow-hidden">
        <picture>
          <source media="(min-width: 1200px)" srcSet="/img/columbus-scioto-3840.webp" />
          <img
            src="/img/columbus-scioto-1600.webp"
            alt="Downtown Columbus at dusk, seen across the Scioto River"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8">
          <div className="reveal mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-3xl bg-paper/90 p-6 backdrop-blur-xl sm:p-8">
              <Eyebrow no="C">Areas</Eyebrow>
              <h2 className="mt-6 heading-4 sm:heading-3">Areas we serve across central Ohio</h2>
              <p className="mt-4 body-3 text-graphite">
                Seven counties around Columbus, including {neighbourhoods.join(", ").replace(/, ([^,]*)$/, " and $1")}.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-line/70 backdrop-blur-xl">
              {areas.map((a) => (
                <li key={a.county} className="bg-paper/90 p-6">
                  <MapPin size={20} weight="duotone" />
                  <p className="mt-6 title-2">{a.county}</p>
                  <p className="mt-1 body-6 text-muted">{a.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="absolute right-4 top-24 rounded-md bg-ink/60 px-2 py-1 caption-5 text-paper backdrop-blur sm:right-8">
          Photo: Carol M. Highsmith, Library of Congress
        </p>
      </div>
    </section>
  );
}

function Prices() {
  return (
    <section id="prices" className="mx-auto max-w-[1280px] px-4 py-24 sm:px-8 lg:py-32">
      <div className="reveal flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow no="D">Prices</Eyebrow>
          <h2 className="mt-6 heading-3 sm:heading-2">Know the terms first</h2>
        </div>
        <p className="max-w-[380px] body-3 text-graphite">Bigger jobs are priced before we start. Here is what that costs and what we ask up front.</p>
      </div>
      <div className="reveal mt-12 grid gap-4 md:grid-cols-3">
        {prices.map((p, i) => (
          <div key={p.label} className={`flex min-h-[320px] flex-col justify-between rounded-3xl p-6 hairline sm:p-8 ${i === 0 ? "bg-hivis [border-color:transparent]" : "bg-card"}`}>
            <p className="font-mono caption-4 text-ink/70">{p.label}</p>
            <div>
              <p className="display-9">{p.value}</p>
              <p className="mt-2 title-2">{p.unit}</p>
              <p className="mt-4 body-6 text-graphite">{p.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-8 lg:pb-32">
      <div className="reveal grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Eyebrow no="E">Questions</Eyebrow>
          <h2 className="mt-6 heading-3 sm:heading-2">Questions homeowners ask</h2>
        </div>
        <div className="overflow-hidden rounded-3xl bg-card hairline">
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-line last:border-b-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 title-2 transition-colors duration-300 hover:bg-paper [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid size-8 shrink-0 place-items-center rounded-lg hairline transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-45 group-open:bg-hivis">
                  <Plus size={14} weight="bold" />
                </span>
              </summary>
              <p className="px-6 pb-6 body-3 text-graphite">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

type Errors = Partial<Record<"name" | "email" | "where" | "job", string>>;

function Quote() {
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const v = (k: string) => String(d.get(k) ?? "").trim();
    const err: Errors = {};
    if (!v("name")) err.name = "Write the name we should ask for.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) err.email = "Write an email address with an @, like name@example.com.";
    if (!v("where")) err.where = "Write where the job is, a street or a neighbourhood.";
    if (!v("job")) err.job = "Write a line about the repair.";
    setErrors(err);
    if (Object.keys(err).length === 0) setSent(v("name"));
  }

  const field = "mt-2 w-full rounded-xl bg-paper px-4 py-3 body-3 hairline outline-none transition-shadow duration-300 focus:shadow-[0_0_0_2px_#141414] aria-[invalid=true]:shadow-[0_0_0_2px_#c2410c]";

  return (
    <section id="quote" className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-8 lg:pb-32">
      <div className="reveal grid overflow-hidden rounded-[32px] bg-card hairline lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col justify-between gap-12 bg-ink p-6 text-paper sm:p-10">
          <div>
            <p className="flex items-center gap-3 font-mono caption-4 text-paper/60">
              <span className="rounded-md bg-hivis px-2 py-1 text-ink">F</span>
              Quote
            </p>
            <h2 className="mt-6 heading-3 sm:heading-2">Request a quote for your repair</h2>
            <p className="mt-6 body-3 text-paper/75">Write a line about the job and where it is. We reply within a working day.</p>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-2xl bg-white/15">
            {prices.map((p) => (
              <div key={p.label} className="flex items-center justify-between bg-ink p-4">
                <dt className="body-6 text-paper/70">{p.label}</dt>
                <dd className="font-mono caption-3">
                  {p.value} {p.unit}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="p-6 sm:p-10">
          {sent ? (
            <div className="flex h-full flex-col justify-center" role="status">
              <CheckCircle size={40} weight="duotone" />
              <p className="mt-6 heading-5">Request ready, {sent}</p>
              <p className="mt-3 body-3 text-graphite">We reply within a working day. This is a demo, so nothing was sent.</p>
              <button type="button" onClick={() => setSent(null)} className="btn btn-ghost button-md mt-8 self-start">
                Write another request
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={submit} className="grid gap-6 sm:grid-cols-2">
              {(
                [
                  { k: "name", label: "Name", type: "text", auto: "name", span: false },
                  { k: "email", label: "Email", type: "email", auto: "email", span: false },
                  { k: "where", label: "Address or neighbourhood", type: "text", auto: "street-address", span: true },
                ] as const
              ).map((f) => (
                <label key={f.k} className={`block ${f.span ? "sm:col-span-2" : ""}`}>
                  <span className="title-4">{f.label}</span>
                  <input name={f.k} type={f.type} autoComplete={f.auto} aria-invalid={!!errors[f.k]} aria-describedby={`${f.k}-err`} className={field} />
                  {errors[f.k] && (
                    <span id={`${f.k}-err`} className="mt-2 block caption-2 text-[#c2410c]">
                      {errors[f.k]}
                    </span>
                  )}
                </label>
              ))}
              <label className="block sm:col-span-2">
                <span className="title-4">What needs fixing</span>
                <textarea name="job" rows={4} aria-invalid={!!errors.job} aria-describedby="job-err" className={`${field} resize-none`} />
                {errors.job && (
                  <span id="job-err" className="mt-2 block caption-2 text-[#c2410c]">
                    {errors.job}
                  </span>
                )}
              </label>
              <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
                <p className="caption-5 text-muted">Weekend work is by appointment. Say so in the message.</p>
                <button type="submit" className="btn btn-primary button-md">
                  Request a quote
                  <span className="btn-chip">
                    <ArrowRight size={14} weight="bold" />
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Visit() {
  return (
    <footer id="visit" className="border-t border-line">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <h2 className="heading-3 sm:heading-2">Get the repair list done</h2>
          <p className="mt-6 body-3 text-graphite">Weekdays 9 AM to 5 PM, emergencies around the clock.</p>
          <a href="#quote" className="btn btn-primary button-md mt-8">
            Request a quote
            <span className="btn-chip">
              <ArrowRight size={14} weight="bold" />
            </span>
          </a>
        </div>
        <div>
          <p className="font-mono caption-4 text-muted">Office</p>
          <p className="mt-4 title-2">{business.street}</p>
          <p className="body-6 text-muted">{business.city}</p>
          <a href={business.directions} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 button-sm underline-offset-4 hover:underline">
            Get directions <ArrowUpRight size={14} />
          </a>
        </div>
        <div>
          <p className="font-mono caption-4 text-muted">Office hours</p>
          <dl className="mt-4 grid gap-3">
            {hours.map((h) => (
              <div key={h.day} className="flex justify-between border-b border-line pb-3">
                <dt className="body-6 text-graphite">{h.day}</dt>
                <dd className="body-4">{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-8 sm:px-8">
        <Logo />
        <nav aria-label="Legal" className="flex flex-wrap gap-6 caption-2 text-muted">
          <span>© 2026 {business.legal}</span>
          <a href="/privacy/" className="hover:text-ink">Privacy</a>
          <a href="/terms/" className="hover:text-ink">Terms</a>
          <a href="/credits/" className="hover:text-ink">Credits</a>
        </nav>
      </div>
    </footer>
  );
}

export default function Sections() {
  useReveal();
  return (
    <>
      <ServicesIndex />
      <Commercial />
      <Tagline />
      <Areas />
      <Prices />
      <Faq />
      <Quote />
      <Visit />
    </>
  );
}
