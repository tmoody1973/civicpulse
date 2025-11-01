import { cn } from '@/lib/utils';

interface Stage {
  name: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface Props {
  billStatus: 'introduced' | 'committee' | 'passed-house' | 'passed-senate' | 'enacted';
  className?: string;
}

export function BillProgressTracker({ billStatus, className }: Props) {
  const stages: Stage[] = [
    { name: 'Introduced', status: getStageStatus('introduced', billStatus) },
    { name: 'Passed House', status: getStageStatus('passed-house', billStatus) },
    { name: 'Passed Senate', status: getStageStatus('passed-senate', billStatus) },
    { name: 'To President', status: getStageStatus('to-president', billStatus) },
    { name: 'Became Law', status: getStageStatus('enacted', billStatus) }
  ];

  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto", className)}>
      {stages.map((stage, index) => (
        <div key={stage.name} className="flex items-center flex-shrink-0">
          {/* Stage box */}
          <div className={cn(
            "px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap",
            stage.status === 'completed' && "bg-green-600 text-white",
            stage.status === 'current' && "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800",
            stage.status === 'upcoming' && "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          )}>
            {stage.name}
          </div>

          {/* Arrow */}
          {index < stages.length - 1 && (
            <svg
              className="w-3 h-3 text-gray-300 flex-shrink-0"
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <polygon points="0,0 12,6 0,12" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function getStageStatus(
  stageName: string,
  currentStatus: string
): 'completed' | 'current' | 'upcoming' {
  // Map status to ordered progression
  const statusOrder: Record<string, number> = {
    'introduced': 0,
    'committee': 0,  // Same as introduced for visual purposes
    'passed-house': 1,
    'passed-senate': 2,
    'to-president': 3,
    'enacted': 4
  };

  const stageOrder: Record<string, number> = {
    'introduced': 0,
    'passed-house': 1,
    'passed-senate': 2,
    'to-president': 3,
    'enacted': 4
  };

  const stageIndex = stageOrder[stageName];
  const currentIndex = statusOrder[currentStatus] ?? 0;

  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'current';
  return 'upcoming';
}
