import { LoadingShell } from '@/components/ui/LoadingShell';

export default function AdminLoading() {
  return <LoadingShell label="Preparing moderation workspace…" skeleton variant="admin" />;
}
