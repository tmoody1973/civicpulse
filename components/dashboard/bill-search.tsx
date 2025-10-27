'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BillSearchProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

const QUICK_TOPICS = [
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Climate', value: 'climate' },
  { label: 'Technology', value: 'technology' },
  { label: 'Economy', value: 'economy' },
  { label: 'Education', value: 'education' },
  { label: 'Housing', value: 'housing' },
];

export function BillSearch({ onSearch, loading = false }: BillSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleTopicClick = (topic: string) => {
    setSearchQuery(topic);
    onSearch(topic);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by keyword or bill number (e.g., HR 1234)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-24"
          disabled={loading}
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          disabled={loading || !searchQuery.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching
            </>
          ) : (
            'Search'
          )}
        </Button>
      </form>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Quick Topics:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_TOPICS.map((topic) => (
            <Badge
              key={topic.value}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => handleTopicClick(topic.value)}
            >
              {topic.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
