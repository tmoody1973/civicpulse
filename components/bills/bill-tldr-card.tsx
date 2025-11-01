import { Card, CardContent } from '@/components/ui/card';
import { FileText, Users, Calendar, TrendingUp } from 'lucide-react';

interface BillTldrCardProps {
  whatItDoes: string;
  whoItAffects: string[];
  status: string;
  introducedDate: string | null;
  impactScore?: number;
}

export function BillTldrCard({ whatItDoes, whoItAffects, status, introducedDate, impactScore }: BillTldrCardProps) {
  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">What This Bill Does</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{whatItDoes}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {/* Who It Affects */}
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Affects</p>
              <p className="text-sm font-medium">{whoItAffects.slice(0, 2).join(', ')}</p>
              {whoItAffects.length > 2 && (
                <p className="text-xs text-muted-foreground">+{whoItAffects.length - 2} more groups</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
              <p className="text-sm font-medium capitalize">{status.replace(/-/g, ' ')}</p>
              {introducedDate && (
                <p className="text-xs text-muted-foreground">
                  Since {new Date(introducedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Impact Score */}
          {impactScore && (
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Impact</p>
                <p className="text-sm font-medium">{impactScore}/100</p>
                <p className="text-xs text-muted-foreground">
                  {impactScore > 70 ? 'High' : impactScore > 40 ? 'Medium' : 'Low'} reach
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
