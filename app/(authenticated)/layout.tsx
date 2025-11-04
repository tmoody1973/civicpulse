import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check for session cookie (using the correct cookie name)
  const cookieStore = await cookies();
  const session = cookieStore.get('civic_pulse_session');

  // Debug logging
  console.log('[Auth Layout] Cookie check:', {
    hasCookie: !!session,
    cookieLength: session?.value?.length || 0,
    allCookies: cookieStore.getAll().map(c => c.name),
    timestamp: new Date().toISOString(),
  });

  // If no session, redirect to login
  if (!session) {
    console.log('[Auth Layout] No session found, redirecting to login');
    redirect('/auth/login');
  }

  console.log('[Auth Layout] Session found, rendering protected content');
  return <>{children}</>;
}
