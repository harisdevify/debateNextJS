import type { ReactNode } from 'react';

// Kept outside the root layout so navigation never remounts auth, header, or active providers.
// Opacity-only animation avoids the translation flash during route and suspense changes.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="route-reveal">{children}</div>;
}
