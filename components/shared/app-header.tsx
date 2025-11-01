import { getSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, User } from 'lucide-react';

export async function AppHeader() {
  const user = await getSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
            <Image
              src="/hakivo-logo.svg"
              alt="HakiVo - Making Congress Accessible"
              width={105}
              height={32}
              priority
              className="dark:brightness-90"
            />
          </Link>

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/search"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Search
              </Link>
              <Link
                href="/settings"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* User info */}
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>

                {/* Sign out button */}
                <form action="/auth/logout" method="POST">
                  <Button variant="ghost" size="sm" type="submit">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
