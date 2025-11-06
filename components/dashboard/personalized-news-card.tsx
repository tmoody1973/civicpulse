'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface PersonalizedArticle {
  title: string;
  url: string;
  publishedDate: string;
  summary: string;
  source: string;
  relevantTopics: string[];
  imageUrl?: string;
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
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-200 bg-white">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col sm:flex-row h-full"
      >
        {/* Left side: Content */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          {/* Category and Follow button */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
              {categoryDisplay}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFollowToggle}
              className={`rounded-full px-3 h-6 text-xs ${
                isFollowing
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>

          {/* Article headline */}
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
            {article.title}
          </h3>
        </div>

        {/* Right side: Image */}
        {article.imageUrl && (
          <div className="w-full sm:w-36 md:w-40 h-32 sm:h-auto flex-shrink-0 bg-gray-100">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </a>
    </Card>
  );
}
