'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/** A ⌘K / Ctrl+K command palette — jump anywhere without hunting the nav. Opens
 *  on the shortcut, fuzzy-filters a small set of destinations, arrow keys to move,
 *  Enter to go, Esc / backdrop to close. Keyboard-first, the Raycast/Arc idea. */
interface Cmd {
  label: string;
  hint: string;
  href: string;
  keywords: string;
}

const COMMANDS: Cmd[] = [
  { label: 'Home', hint: 'The landing experience', href: '/', keywords: 'home landing start' },
  {
    label: 'Campaigns',
    hint: 'Browse milestone-gated raises',
    href: '/campaigns',
    keywords: 'browse raises invest back',
  },
  {
    label: 'Create a campaign',
    hint: 'Launch a new vault',
    href: '/create',
    keywords: 'new launch found raise deploy',
  },
  {
    label: 'Dashboard',
    hint: 'Your stats & activity',
    href: '/dashboard',
    keywords: 'stats founder investor pledges',
  },
  {
    label: 'Account',
    hint: 'Your wallet & session',
    href: '/account',
    keywords: 'profile wallet settings',
  },
  {
    label: 'Moderation',
    hint: 'Admin risk triage',
    href: '/admin',
    keywords: 'admin moderation risk hide',
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Global shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus + reset when opened.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.includes(q) ||
        c.hint.toLowerCase().includes(q),
    );
  }, [query]);

  if (!open) return null;

  const go = (c: Cmd | undefined) => {
    if (!c) return;
    setOpen(false);
    router.push(c.href);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[120] flex items-start justify-center bg-void/70 p-4 pt-[14vh] backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-panel/95 shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            }
            if (e.key === 'Enter') go(results[active]);
          }}
          placeholder="Jump to…  (Campaigns, Create, Dashboard…)"
          className="w-full border-b border-line bg-transparent px-5 py-4 font-sans text-body text-paper outline-none placeholder:text-mist"
        />
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center font-sans text-small text-mist">No matches.</li>
          ) : (
            results.map((c, i) => (
              <li key={c.href}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(c)}
                  className={`flex w-full items-center justify-between gap-4 rounded-md px-4 py-2.5 text-left transition-colors ${
                    i === active ? 'bg-paper/[0.07]' : 'hover:bg-paper/[0.04]'
                  }`}
                >
                  <span className="font-sans text-body text-paper">{c.label}</span>
                  <span className="font-mono text-caption uppercase tracking-widest text-mist">
                    {c.hint}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-line px-4 py-2 font-mono text-caption uppercase tracking-widest text-mist">
          ↑↓ move · ↵ open · esc close · ⌘K toggle
        </div>
      </div>
    </div>
  );
}
