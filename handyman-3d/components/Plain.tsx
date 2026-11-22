import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function Plain({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto min-h-svh max-w-[760px] px-4 py-24 sm:px-8">
      <a href="/" className="btn btn-ghost button-sm">
        <ArrowLeft size={14} /> Back to the site
      </a>
      <p className="mt-16 font-mono caption-4 text-muted">{eyebrow}</p>
      <h1 className="mt-4 heading-3 sm:heading-2">{title}</h1>
      <div className="mt-8 grid gap-4 body-3 text-graphite">{children}</div>
    </main>
  );
}
