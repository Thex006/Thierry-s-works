"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowDown, Clock } from "@phosphor-icons/react/dist/ssr";
import { SHOTS, clamp01, stage } from "@/lib/stage";
import { services } from "@/lib/content";
import { LAYOUT } from "@/lib/tools";

const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

const mm = (id: string) => Math.round(Math.max(LAYOUT[id].l, LAYOUT[id].w) * 1000);

function Panel({ i, children, className = "" }: { i: number; children: React.ReactNode; className?: string }) {
  return (
    <div
      data-shot={i}
      className={`stage-panel pointer-events-none absolute inset-x-4 bottom-6 opacity-0 sm:inset-x-auto sm:bottom-auto sm:left-10 sm:top-1/2 sm:w-[460px] sm:-translate-y-1/2 lg:left-16 ${className}`}
    >
      {children}
    </div>
  );
}

export default function Stage() {
  const root = useRef<HTMLElement>(null);
  const tape = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);

  // Stop rendering WebGL once the stage has scrolled out of view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Loading progress from the WebGL scene
  useEffect(() => {
    const on = (e: Event) => {
      const { progress, active } = (e as CustomEvent).detail as { progress: number; active: boolean };
      setLoaded(progress);
      if (!active && progress >= 100) setTimeout(() => setReady(true), 350);
    };
    window.addEventListener("stage-progress", on);
    const failsafe = setTimeout(() => setReady(true), 15000);
    return () => {
      window.removeEventListener("stage-progress", on);
      clearTimeout(failsafe);
    };
  }, []);

  // One rAF loop: scroll -> stage progress -> panel opacity. No scroll listeners.
  useEffect(() => {
    let raf = 0;
    const panels = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-shot]") ?? []);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onMove = (e: PointerEvent) => {
      stage.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      stage.mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const tick = () => {
      const el = root.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const span = r.height - window.innerHeight;
        const p = clamp01(-r.top / Math.max(1, span));
        stage.progress = p;
        stage.mobile = window.innerWidth < 640;
        const t = p * (SHOTS.length - 1);
        for (const node of panels) {
          const i = Number(node.dataset.shot);
          const d = Math.abs(t - i);
          const w = clamp01(1 - (d - 0.2) / 0.22);
          node.style.opacity = String(w);
          node.style.pointerEvents = w > 0.6 ? "auto" : "none";
          if (!reduce) {
            const dir = t < i ? 1 : -1;
            const y = (1 - w) * 32 * dir;
            node.style.translate = `0 ${y}px`;
          }
        }
        if (tape.current) tape.current.style.transform = `scaleY(${p})`;
        if (readout.current) readout.current.textContent = `${(p * 96).toFixed(1).padStart(4, "0")} in`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section ref={root} id="top" aria-label="Handyman service in Columbus, Ohio" style={{ height: `${SHOTS.length * 100}svh` }} className="relative">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div className="absolute inset-0" aria-hidden>
          <Scene active={active} />
        </div>

        {/* Loader: a tape measure pulling out while the scanned tools load */}
        <div
          className={`absolute inset-0 z-30 grid place-items-center bg-paper transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}
          role="status"
          aria-live="polite"
        >
          <div className="w-[min(420px,80vw)]">
            <div className="mb-3 flex items-baseline justify-between font-mono caption-4 text-muted">
              <span>Laying out the tools</span>
              <span>{Math.round(loaded)}%</span>
            </div>
            <div className="relative h-8 overflow-hidden rounded-md bg-card hairline">
              <div
                className="absolute inset-y-0 left-0 bg-hivis transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: "100%", transform: `translateX(${loaded - 100}%)` }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #141414 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, #141414 0 1px, transparent 1px 50px)",
                  backgroundSize: "100% 8px, 100% 16px",
                  backgroundRepeat: "no-repeat",
                }}
              />
            </div>
          </div>
        </div>

        {/* Tape measure scroll gauge */}
        <div className="pointer-events-none absolute right-4 top-24 bottom-24 z-10 hidden w-10 sm:block lg:right-8" aria-hidden>
          <div className="tape-ticks absolute inset-y-0 right-0 w-4 opacity-40" />
          <div ref={tape} className="absolute right-5 top-0 h-full w-2 origin-top rounded-sm bg-hivis" style={{ transform: "scaleY(0)" }} />
          <span ref={readout} className="absolute -bottom-8 right-0 whitespace-nowrap font-mono caption-4 text-muted">
            00.0 in
          </span>
        </div>

        {/* Shot 0: hero */}
        <Panel i={0} className="sm:w-[620px]">
          <p className="mb-6 flex items-center gap-2 caption-1 text-graphite">
            <span className="pulse-dot inline-block size-2 rounded-full bg-[#1d9b4b]" />
            Emergency repairs 24 hours a day
          </p>
          <h1 className="heading-1 ink-gradient max-w-[680px] pb-1 sm:text-7xl sm:leading-none">
            Handyman service
            <br />
            in Columbus, Ohio
          </h1>
          <p className="mt-6 max-w-[520px] body-3 text-graphite sm:title-2 sm:font-normal">
            Plumbing, electrical, drywall and painting for homes, offices and commercial sites in Franklin County. One insured crew.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#quote" className="btn btn-primary button-md">
              Request a quote
              <span className="btn-chip">
                <ArrowRight size={14} weight="bold" />
              </span>
            </a>
            <a href="#services-list" className="btn btn-ghost button-md">
              See services
            </a>
          </div>
          <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono caption-4 text-muted">
            <span>Weekdays 9 AM to 5 PM</span>
            <span className="size-1 rounded-full bg-muted" />
            <span>Insured crew across seven Ohio counties</span>
          </p>
        </Panel>

        {/* Shot 1: knolled board */}
        <Panel i={1}>
          <div className="rounded-3xl bg-card/85 p-6 backdrop-blur-md hairline sm:bg-transparent sm:p-0 sm:backdrop-blur-none sm:[border:0]">
            <p className="font-mono caption-4 text-muted">Repairs we handle</p>
            <h2 className="mt-3 heading-3 sm:heading-2">
              One call for
              <br />
              most of the house
            </h2>
            <p className="mt-4 max-w-[400px] body-3 text-graphite">
              Every tool laid out before the job starts. Scroll to pick them up one at a time.
            </p>
            <ol className="mt-6 hidden gap-2 sm:grid">
              {services.map((s) => (
                <li key={s.id} className="flex items-center gap-3 body-6 text-graphite">
                  <span className="font-mono caption-4 text-muted">{s.no}</span>
                  {s.title}
                </li>
              ))}
            </ol>
          </div>
        </Panel>

        {/* Shots 2 to 6: one service per tool */}
        {services.map((s, k) => (
          <Panel key={s.id} i={k + 2}>
            <article className="rounded-3xl bg-card/90 p-6 backdrop-blur-md hairline sm:p-8">
              <div className="flex items-center justify-between font-mono caption-4 text-muted">
                <span>
                  {s.no} / 05 · {s.group}
                </span>
                <span className="rounded-md bg-hivis px-2 py-1 text-ink">{mm(s.tool)} mm</span>
              </div>
              <h3 className="mt-6 heading-4 sm:heading-3">{s.title}</h3>
              <p className="mt-4 body-3 text-graphite">{s.body}</p>
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                <span className="caption-1 text-muted">On the bench: {s.toolName}</span>
                <a href="#quote" className="inline-flex items-center gap-1 button-sm underline-offset-4 hover:underline">
                  Quote this <ArrowRight size={14} weight="bold" />
                </a>
              </div>
            </article>
          </Panel>
        ))}

        {/* Shot 7: final */}
        <Panel i={SHOTS.length - 1}>
          <div className="rounded-3xl bg-card/90 p-6 backdrop-blur-md hairline sm:p-8">
            <p className="font-mono caption-4 text-muted">How we turn up</p>
            <h2 className="mt-3 heading-3">Every tool for the whole repair list</h2>
            <p className="mt-4 body-3 text-graphite">
              We price the bigger jobs before we start and bring what the list needs, so one visit covers it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#quote" className="btn btn-primary button-md">
                Request a quote
                <span className="btn-chip">
                  <ArrowRight size={14} weight="bold" />
                </span>
              </a>
              <a href="#visit" className="btn btn-ghost button-md">
                <Clock size={16} /> Office hours
              </a>
            </div>
          </div>
        </Panel>

        <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 caption-4 text-muted sm:flex" data-shot={0}>
          <ArrowDown size={14} /> Scroll to lay out the bench
        </div>
      </div>
    </section>
  );
}
