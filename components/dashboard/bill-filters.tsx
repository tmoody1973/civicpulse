'use client';

import { useState } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface BillFilterOptions {
  searchQuery: string;
  status: string[];
  categories: string[];
  impactLevel: string;
  party: string[];
}

interface BillFiltersProps {
  filters: BillFilterOptions;
  onFilterChange: (filters: BillFilterOptions) => void;
  availableCategories?: string[];
  availablePolicyAreas?: string[];
}

const STATUS_OPTIONS = [
  { value: 'introduced', label: 'Introduced' },
  { value: 'committee', label: 'In Committee' },
  { value: 'passed-house', label: 'Passed House' },
  { value: 'passed-senate', label: 'Passed Senate' },
  { value: 'enacted', label: 'Enacted' },
];

const IMPACT_OPTIONS = [
  { value: 'all', label: 'All Impact Levels' },
  { value: 'high', label: 'High Impact (70+)' },
  { value: 'medium', label: 'Medium Impact (40-69)' },
  { value: 'low', label: 'Low Impact (0-39)' },
];

const PARTY_OPTIONS = [
  { value: 'Democrat', label: 'Democrat' },
  { value: 'Republican', label: 'Republican' },
  { value: 'Independent', label: 'Independent' },
];

export function BillFilters({
  filters,
  onFilterChange,
  availableCategories = [],
}: BillFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, searchQuery: value });
  };

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFilterChange({ ...filters, status: newStatus });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const toggleParty = (party: string) => {
    const newParty = filters.party.includes(party)
      ? filters.party.filter(p => p !== party)
      : [...filters.party, party];
    onFilterChange({ ...filters, party: newParty });
  };

  const handleImpactChange = (value: string) => {
    onFilterChange({ ...filters, impactLevel: value });
  };

  const clearAllFilters = () => {
    onFilterChange({
      searchQuery: '',
      status: [],
      categories: [],
      impactLevel: 'all',
      party: [],
    });
  };

  const activeFilterCount =
    filters.status.length +
    filters.categories.length +
    filters.party.length +
    (filters.impactLevel !== 'all' ? 1 : 0);

  return (
    <div className="space-y-3 pb-4 border-b">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search bills by title, number, or sponsor..."
          value={filters.searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {filters.searchQuery && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Advanced Filters Toggle */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  filtersOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground"
            >
              Clear All
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-4 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <Badge
                  key={option.value}
                  variant={filters.status.includes(option.value) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleStatus(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Impact Level Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Impact Level</label>
            <Select value={filters.impactLevel} onValueChange={handleImpactChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPACT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Categories</label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.slice(0, 10).map((category) => (
                  <Badge
                    key={category}
                    variant={filters.categories.includes(category) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Party Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Sponsor Party</label>
            <div className="flex flex-wrap gap-2">
              {PARTY_OPTIONS.map((option) => (
                <Badge
                  key={option.value}
                  variant={filters.party.includes(option.value) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80"
                  onClick={() => toggleParty(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && !filtersOpen && (
        <div className="flex flex-wrap gap-2">
          {filters.status.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              {STATUS_OPTIONS.find(s => s.value === status)?.label}
              <button onClick={() => toggleStatus(status)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.categories.map((category) => (
            <Badge key={category} variant="secondary" className="gap-1">
              {category}
              <button onClick={() => toggleCategory(category)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.party.map((party) => (
            <Badge key={party} variant="secondary" className="gap-1">
              {party}
              <button onClick={() => toggleParty(party)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.impactLevel !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {IMPACT_OPTIONS.find(i => i.value === filters.impactLevel)?.label}
              <button onClick={() => handleImpactChange('all')} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
