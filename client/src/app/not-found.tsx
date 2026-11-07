import { SearchX } from 'lucide-react';
import { StatusPage } from '@/components/ui/StatusPage';

export default function NotFound() {
  return <StatusPage eyebrow="404 · Page not found" title="This page isn't here" description="The link may have changed, or the page no longer exists. Return home to continue." icon={SearchX} />;
}
