import { CheckCircle2, FileText, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Civic Pulse</h1>
            <nav className="flex items-center gap-4">
              <Button variant="ghost">My Bills</Button>
              <Button variant="ghost">Representatives</Button>
              <Button variant="ghost">Settings</Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome message */}
        <div className="mb-8 bg-primary/10 border border-primary/20 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold mb-2">Welcome to Civic Pulse!</h2>
              <p className="text-muted-foreground">
                Your account is all set up. We're now tracking congressional bills related to your interests and finding your representatives.
              </p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Bills Tracked</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Your Representatives</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">New Bills This Week</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Placeholder sections */}
        <div className="space-y-6">
          <Card className="p-8">
            <h3 className="text-lg font-semibold mb-4">Recent Congressional Activity</h3>
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No bills tracked yet</p>
              <Button>Browse Bills</Button>
            </div>
          </Card>

          <Card className="p-8">
            <h3 className="text-lg font-semibold mb-4">Your Representatives</h3>
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">Loading your congressional representatives...</p>
              <p className="text-sm">We'll show you their voting records and sponsored bills</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
