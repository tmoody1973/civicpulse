import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check for session cookie
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  // If no session, redirect to login
  if (!session) {
    redirect('/auth/login');
  }

  return <>{children}</>;
}
