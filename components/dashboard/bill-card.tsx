import { FileText, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Bill {
  id: string;
  number: string;
  title: string;
  summary: string;
  status: 'introduced' | 'committee' | 'passed-house' | 'passed-senate' | 'enacted';
  issueCategories: string[];
  impactScore: number;
  lastAction: string;
  lastActionDate: string;
}

interface BillCardProps {
  bill: Bill;
}

const STATUS_LABELS: Record<Bill['status'], string> = {
  'introduced': 'Introduced',
  'committee': 'In Committee',
  'passed-house': 'Passed House',
  'passed-senate': 'Passed Senate',
  'enacted': 'Enacted',
};

const STATUS_VARIANTS: Record<Bill['status'], 'default' | 'secondary' | 'outline'> = {
  'introduced': 'outline',
  'committee': 'secondary',
  'passed-house': 'default',
  'passed-senate': 'default',
  'enacted': 'default',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function BillCard({ bill }: BillCardProps) {
  const impactColor = bill.impactScore > 70 ? 'text-red-600' : bill.impactScore > 40 ? 'text-orange-600' : 'text-blue-600';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground mb-1">{bill.number}</p>
              <CardTitle className="text-base leading-tight">{bill.title}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <TrendingUp className={`w-4 h-4 ${impactColor}`} />
            <span className={`text-sm font-semibold ${impactColor}`}>{bill.impactScore}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={STATUS_VARIANTS[bill.status]}>
            {STATUS_LABELS[bill.status]}
          </Badge>
          {bill.issueCategories.map(category => (
            <Badge key={category} variant="outline" className="font-normal">
              {category}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {bill.summary}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Last action: {bill.lastAction} ({formatDate(bill.lastActionDate)})</span>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            View Details
          </Button>
          <Button size="sm" className="flex-1">
            Track Bill
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
