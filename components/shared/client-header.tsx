'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, User, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export function ClientHeader() {
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    // Check if user is logged in via session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // User not logged in
      });
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="HakiVo - Making Congress Accessible"
              width={150}
              height={45}
              priority
              className="dark:brightness-90"
            />
          </Link>

          {/* Desktop Navigation */}
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
                href="/onboarding"
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

                {/* Mobile menu */}
                <Sheet>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="sm">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <div className="flex flex-col gap-4 mt-8">
                      <Link
                        href="/dashboard"
                        className="text-lg font-medium hover:text-primary transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/search"
                        className="text-lg font-medium hover:text-primary transition-colors"
                      >
                        Search
                      </Link>
                      <Link
                        href="/onboarding"
                        className="text-lg font-medium hover:text-primary transition-colors"
                      >
                        Settings
                      </Link>
                      <div className="pt-4 border-t">
                        <form action="/auth/logout" method="POST">
                          <Button variant="ghost" className="w-full justify-start" type="submit">
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                          </Button>
                        </form>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sign out button (desktop) */}
                <form action="/auth/logout" method="POST" className="hidden md:block">
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
