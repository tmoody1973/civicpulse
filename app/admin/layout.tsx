import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Check admin access - throws if not authenticated or not admin
    await requireAdmin();
  } catch (error) {
    // Redirect to login if not authenticated or not authorized
    redirect('/login?returnTo=/admin&error=admin_only');
  }

  return <>{children}</>;
}
