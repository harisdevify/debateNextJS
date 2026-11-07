import { ShieldAlert } from 'lucide-react';
import { StatusPage } from '@/components/ui/StatusPage';

export default function ForbiddenPage() {
  return <StatusPage eyebrow="403 · Access restricted" title="You don't have access" description="This area is restricted to accounts with the required permissions." icon={ShieldAlert} />;
}
