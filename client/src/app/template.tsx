// Subtle page entrance on every navigation (Apple-like, non-janky).
// Kept transform+opacity only for GPU compositing.
import type { ReactNode } from 'react';

export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
