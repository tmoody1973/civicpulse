import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface JargonTooltipProps {
  term: string;
  explanation: string;
  children?: React.ReactNode;
}

export function JargonTooltip({ term, explanation, children }: JargonTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 border-b border-dotted border-muted-foreground cursor-help">
            {children || term}
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Common legislative terms with plain language explanations
export const legislativeTerms = {
  congress: (number: number) => ({
    term: `${number}th Congress`,
    explanation: `Current session of Congress (${2025 + (number - 119) * 2}-${2027 + (number - 119) * 2})`,
  }),
  committee: {
    term: 'Committee Review',
    explanation: 'A group of Congress members reviews the bill to decide if it should move forward',
  },
  subcommittee: {
    term: 'Subcommittee',
    explanation: 'A smaller specialized group within a committee that focuses on specific topics',
  },
  introduced: {
    term: 'Introduced',
    explanation: 'The bill was formally proposed in Congress',
  },
  referred: {
    term: 'Referred',
    explanation: 'The bill was sent to a committee for review',
  },
  passedHouse: {
    term: 'Passed House',
    explanation: 'The House of Representatives voted to approve the bill',
  },
  passedSenate: {
    term: 'Passed Senate',
    explanation: 'The Senate voted to approve the bill',
  },
  enacted: {
    term: 'Enacted',
    explanation: 'The bill became law after being signed by the President',
  },
  cosponsor: {
    term: 'Cosponsor',
    explanation: 'A member of Congress who supports the bill along with the main sponsor',
  },
  amendment: {
    term: 'Amendment',
    explanation: 'A proposed change to the bill before it becomes law',
  },
  floor: {
    term: 'Floor',
    explanation: 'The main area of the House or Senate where bills are debated and voted on',
  },
  markup: {
    term: 'Markup',
    explanation: 'When a committee makes changes to a bill before sending it to the full chamber',
  },
  cloture: {
    term: 'Cloture',
    explanation: 'A vote to end debate and move to a final vote (needs 60 votes in Senate)',
  },
  filibuster: {
    term: 'Filibuster',
    explanation: 'When senators extend debate to delay or prevent a vote on a bill',
  },
  veto: {
    term: 'Veto',
    explanation: 'When the President rejects a bill passed by Congress',
  },
  override: {
    term: 'Override',
    explanation: 'When Congress votes to pass a bill despite a Presidential veto (requires 2/3 majority)',
  },
};
