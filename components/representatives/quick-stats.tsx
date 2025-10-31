/**
 * Quick Stats Component
 *
 * Displays key statistics for a representative's legislative activity
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Activity, Tags } from 'lucide-react';

interface QuickStatsProps {
  stats: {
    totalSponsored: number;
    totalCosponsored: number;
    lawsPassed: number;
    activeBills: number;
    policyAreas: number;
  };
}

export function QuickStats({ stats }: QuickStatsProps) {
  const {
    totalSponsored = 0,
    totalCosponsored = 0,
    lawsPassed = 0,
    activeBills = 0,
    policyAreas = 0
  } = stats;

  // Calculate success rate
  const successRate = totalSponsored > 0
    ? Math.round((lawsPassed / totalSponsored) * 100)
    : 0;

  const statCards = [
    {
      title: 'Bills Sponsored',
      value: totalSponsored,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Bills Co-Sponsored',
      value: totalCosponsored,
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      title: 'Laws Passed',
      value: lawsPassed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      subtitle: `${successRate}% success rate`
    },
    {
      title: 'Active Bills',
      value: activeBills,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Policy Areas',
      value: policyAreas,
      icon: Tags,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Legislative Activity</h2>
        <p className="text-gray-600 mt-1">Key statistics and accomplishments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className={`border-2 ${stat.borderColor} transition-all hover:shadow-md`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      {stat.value.toLocaleString()}
                    </p>
                    {stat.subtitle && (
                      <p className="text-xs text-gray-500">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
