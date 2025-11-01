import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStep {
  label: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface BillProgressTimelineProps {
  billStatus: string;
}

export function BillProgressTimeline({ billStatus }: BillProgressTimelineProps) {
  // Map bill status to timeline steps
  const getSteps = (): ProgressStep[] => {
    const allSteps = [
      { key: 'introduced', label: 'Introduced', description: 'Bill proposed in Congress' },
      { key: 'committee', label: 'Committee Review', description: 'Being evaluated by committee' },
      { key: 'passed-house', label: 'House Vote', description: 'Voted on by House' },
      { key: 'passed-senate', label: 'Senate Vote', description: 'Voted on by Senate' },
      { key: 'enacted', label: 'Became Law', description: 'Signed by President' },
    ];

    // Determine current step index
    const statusMap: Record<string, number> = {
      'introduced': 0,
      'committee': 1,
      'passed-house': 2,
      'passed-senate': 3,
      'enacted': 4,
    };

    const currentIndex = statusMap[billStatus] ?? 1;

    return allSteps.map((step, index) => ({
      label: step.label,
      description: step.description,
      status: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming',
    }));
  };

  const steps = getSteps();

  return (
    <div className="relative">
      {/* Progress bar background */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" aria-hidden="true" />

      {/* Active progress bar */}
      <div
        className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
        style={{
          width: `${(steps.filter(s => s.status === 'completed').length / (steps.length - 1)) * 100}%`
        }}
        aria-hidden="true"
      />

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            {/* Icon */}
            <div
              className={cn(
                'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all',
                step.status === 'completed' && 'bg-primary border-primary text-primary-foreground',
                step.status === 'current' && 'bg-background border-primary text-primary animate-pulse',
                step.status === 'upcoming' && 'bg-background border-border text-muted-foreground'
              )}
            >
              {step.status === 'completed' && <Check className="w-5 h-5" />}
              {step.status === 'current' && <Clock className="w-5 h-5" />}
              {step.status === 'upcoming' && <Circle className="w-5 h-5" />}
            </div>

            {/* Label */}
            <div className="mt-3 text-center">
              <p
                className={cn(
                  'text-sm font-medium',
                  step.status === 'current' && 'text-primary',
                  step.status === 'upcoming' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1 hidden sm:block max-w-[120px]">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
