import Link from 'next/link';
import { META, SECTIONS, type Block } from './whitepaper-content';
import { WhitePaperNav } from './WhitePaperNav';

/** Renders the RaiseDAO white paper from structured content: a cover panel, a
 *  linked table of contents, then each numbered section. Plain editorial styling
 *  that matches the site theme; all prose lives in whitepaper-content.ts. */

function BlockView({ block }: { block: Block }) {
  if (block.type === 'p') {
    return <p className="font-sans text-body leading-relaxed text-mist">{block.text}</p>;
  }
  if (block.type === 'ul') {
    return (
      <ul className="space-y-2">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-3 font-sans text-body leading-relaxed text-mist">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-data" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === 'links') {
    return (
      <ul className="space-y-2">
        {block.items.map((link, i) => {
          const external = link.href.startsWith('http');
          return (
            <li key={i} className="flex gap-3 font-sans text-body leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-data" aria-hidden />
              {external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-data underline-offset-4 transition-colors hover:underline"
                >
                  {link.label} ↗
                </a>
              ) : (
                <Link
                  href={link.href}
                  className="text-data underline-offset-4 transition-colors hover:underline"
                >
                  {link.label} →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line">
      {block.rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[10rem_1fr] gap-4 bg-panel/60 px-4 py-3">
          <dt className="font-mono text-caption uppercase tracking-widest text-mist">{row.k}</dt>
          <dd className="font-sans text-small text-paper">{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function WhitePaper() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Cover */}
      <header className="rounded-2xl border border-line bg-panel/40 p-10 text-center">
        <p className="font-mono text-caption uppercase tracking-widest text-mist">White paper</p>
        <h1 className="mt-4 font-display text-hero font-semibold tracking-tight text-paper">
          {META.title}
        </h1>
        <p className="mt-3 font-sans text-body text-mist">{META.subtitle}</p>
        <p className="mt-6 font-mono text-caption uppercase tracking-widest text-mist">
          {META.version} <span className="text-data">·</span> {META.date}{' '}
          <span className="text-data">·</span> {META.network}
        </p>
      </header>

      {/* Sidebar (desktop scroll-spy) + content. */}
      <div className="mt-12 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <WhitePaperNav />

        <div className="min-w-0">
          {/* Inline table of contents for narrow screens (the sidebar replaces it on desktop). */}
          <nav aria-label="Table of contents" className="lg:hidden">
            <h2 className="font-mono text-caption uppercase tracking-widest text-mist">
              Table of contents
            </h2>
            <ol className="mt-4 divide-y divide-line border-y border-line">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-baseline gap-3 py-2.5 font-sans text-small text-paper transition-colors hover:text-data"
                  >
                    <span className="font-mono text-caption text-mist">{s.num}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-12 space-y-14 lg:mt-0">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <p className="font-mono text-caption uppercase tracking-widest text-data">
                  {s.num}
                </p>
                <h2 className="mt-2 font-display text-h1 font-semibold tracking-tight text-paper">
                  {s.title}
                </h2>
                <div className="mt-5 space-y-4">
                  {s.blocks.map((block, i) => (
                    <BlockView key={i} block={block} />
                  ))}
                </div>
              </section>
            ))}

            <footer className="mt-16 border-t border-line pt-8">
              <Link
                href="/campaigns"
                className="inline-flex items-center gap-2 rounded-full bg-data px-6 py-2.5 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90"
              >
                Explore live campaigns →
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
