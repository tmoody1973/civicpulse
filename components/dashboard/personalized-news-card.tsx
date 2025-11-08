'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

export interface PersonalizedArticle {
  title: string;
  url: string;
  publishedDate: string;
  summary: string;
  source: string;
  relevantTopics: string[];
}

interface PersonalizedNewsCardProps {
  article: PersonalizedArticle;
}

// Map topics to display names
const topicDisplayNames: Record<string, string> = {
  'healthcare': 'Healthcare',
  'education': 'Education',
  'science': 'Science',
  'technology': 'Tech',
  'climate': 'Climate',
  'economy': 'Economy',
  'business': 'Business',
  'taxes': 'Taxes',
  'immigration': 'Immigration',
  'housing': 'Housing',
  'defense': 'Defense',
  'transportation': 'Transportation',
  'agriculture': 'Agriculture',
  'social': 'Social',
  'civil-rights': 'Civil Rights',
};

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Recently'; // Fallback for invalid dates
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently'; // Fallback for any parsing errors
  }
}

export function PersonalizedNewsCard({ article }: PersonalizedNewsCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  // Get primary category from first topic
  const primaryTopic = article.relevantTopics[0] || 'news';
  const categoryDisplay = topicDisplayNames[primaryTopic] || primaryTopic.charAt(0).toUpperCase() + primaryTopic.slice(1);

  const handleFollowToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFollowing(!isFollowing);
  };

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-all duration-200">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-3"
      >
        {/* Category and Follow button */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
            {categoryDisplay}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFollowToggle}
            className={`rounded-full px-2 h-5 text-xs ${
              isFollowing
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'hover:bg-muted'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        </div>

        {/* Article headline */}
        <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
          {article.title}
        </h3>

        {/* Source and Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium truncate">{article.source}</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(article.publishedDate)}</span>
          </div>
        </div>
      </a>
    </Card>
  );
}
