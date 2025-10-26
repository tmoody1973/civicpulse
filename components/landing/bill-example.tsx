import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bookmark, Volume2, CheckCircle, XCircle } from 'lucide-react';

export function BillExample() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See It In Action
          </h2>
          <p className="text-lg text-muted-foreground">
            Here's what tracking a bill looks like
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card className="shadow-xl">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-muted-foreground">H.R. 1234</span>
                    <Badge variant="secondary">Passed House</Badge>
                  </div>
                  <h3 className="text-xl font-semibold">
                    Healthcare Reform Act of 2025
                  </h3>
                </div>
                <Button variant="ghost" size="icon">
                  <Bookmark className="w-5 h-5" />
                </Button>
              </div>

              {/* Issue Tags */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Healthcare</Badge>
                <Badge variant="outline">Economy</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* AI Summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">AI Plain English Summary</p>
                <p className="text-sm text-muted-foreground">
                  This bill expands Medicare coverage to include dental, vision, and hearing services.
                  It also caps prescription drug costs at $2,000 per year for seniors and allows Medicare
                  to negotiate drug prices with pharmaceutical companies.
                </p>
              </div>

              {/* Your Representatives' Votes */}
              <div>
                <p className="text-sm font-medium mb-3">Your Representatives</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div>
                        <p className="text-sm font-medium">Rep. Jane Smith</p>
                        <p className="text-xs text-muted-foreground">CA-12</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium">Yea</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div>
                        <p className="text-sm font-medium">Sen. John Doe</p>
                        <p className="text-xs text-muted-foreground">California</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Pending</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button className="flex-1">
                  Track This Bill
                </Button>
                <Button variant="outline" className="flex-1">
                  Read Full Summary
                </Button>
                <Button variant="ghost" size="icon">
                  <Volume2 className="w-5 h-5" />
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                <Volume2 className="w-3 h-3 inline mr-1" />
                Listen to 4-min audio summary
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
