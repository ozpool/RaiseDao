'use client';

import Link from 'next/link';
import { useIsAdmin } from '@/hooks/useAdmin';

/** Renders the Moderation link only for an admin session — a small client island
 *  so the Header itself can stay a server component. */
export function AdminNavLink() {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <Link href="/admin" className="transition-colors hover:text-paper">
      Moderation
    </Link>
  );
}
