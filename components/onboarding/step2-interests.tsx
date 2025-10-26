'use client';

import { useState } from 'react';
import {
  Heart, Stethoscope, GraduationCap, Leaf, DollarSign, Shield, Home,
  Users, FlaskRound as Flask, Cpu, Briefcase, Calculator, Globe, Truck, Sprout, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface Step2Props {
  initialData: { interests: string[] };
  onNext: (data: { interests: string[] }) => void;
  onBack: () => void;
}

// Maps to Congress.gov's 32 Policy Areas for comprehensive bill tracking
const ISSUE_CATEGORIES = [
  // Column 1
  { id: 'healthcare', label: 'Healthcare', icon: Stethoscope, color: 'text-red-500' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: 'text-blue-500' },
  { id: 'science', label: 'Science & Research', icon: Flask, color: 'text-purple-500' },
  { id: 'technology', label: 'Technology & Privacy', icon: Cpu, color: 'text-cyan-500' },
  { id: 'climate', label: 'Climate & Environment', icon: Leaf, color: 'text-green-500' },

  // Column 2
  { id: 'economy', label: 'Economy & Jobs', icon: DollarSign, color: 'text-yellow-500' },
  { id: 'business', label: 'Business & Trade', icon: Briefcase, color: 'text-orange-500' },
  { id: 'taxes', label: 'Taxes & Budget', icon: Calculator, color: 'text-emerald-500' },
  { id: 'immigration', label: 'Immigration', icon: Globe, color: 'text-indigo-500' },
  { id: 'housing', label: 'Housing', icon: Home, color: 'text-amber-500' },

  // Column 3
  { id: 'defense', label: 'Defense & Security', icon: Shield, color: 'text-slate-500' },
  { id: 'transportation', label: 'Transportation & Infrastructure', icon: Truck, color: 'text-gray-500' },
  { id: 'agriculture', label: 'Agriculture & Food', icon: Sprout, color: 'text-lime-500' },
  { id: 'social', label: 'Social Services', icon: Heart, color: 'text-pink-500' },
  { id: 'civil-rights', label: 'Civil Rights & Justice', icon: Scale, color: 'text-violet-500' },
];

export function Step2Interests({ initialData, onNext, onBack }: Step2Props) {
  const [selected, setSelected] = useState<string[]>(initialData.interests);

  const toggleInterest = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = () => {
    onNext({ interests: selected });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">What issues matter to you?</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Select the topics you care about. We'll prioritize bills and updates related to your interests.
        </p>
        {selected.length > 0 && (
          <p className="text-sm text-primary font-medium">
            {selected.length} {selected.length === 1 ? 'topic' : 'topics'} selected
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
        {ISSUE_CATEGORIES.map(({ id, label, icon: Icon, color }) => (
          <div
            key={id}
            onClick={() => toggleInterest(id)}
            className={`
              flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer
              min-h-[56px] min-w-[200px]
              ${selected.includes(id)
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
            `}
            role="button"
            tabIndex={0}
            aria-pressed={selected.includes(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleInterest(id);
              }
            }}
          >
            <div className={`flex-shrink-0 ${color}`} aria-hidden="true">
              <Icon className="w-6 h-6" />
            </div>
            <span className="flex-1 text-left font-medium text-sm sm:text-base">{label}</span>
            <Checkbox
              checked={selected.includes(id)}
              onCheckedChange={() => toggleInterest(id)}
              aria-label={`Select ${label}`}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 max-w-sm mx-auto">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
          size="lg"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          className="flex-1"
          size="lg"
          disabled={selected.length === 0}
        >
          Continue
        </Button>
      </div>

      {selected.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Select at least one topic to continue
        </p>
      )}
    </div>
  );
}
