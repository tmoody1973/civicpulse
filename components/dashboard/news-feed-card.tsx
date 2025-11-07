import { ExternalLink, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  source: string;
  imageUrl?: string;
}

interface NewsFeedCardProps {
  article: NewsArticle;
  featured?: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NewsFeedCard({ article, featured = false }: NewsFeedCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className={`leading-tight ${featured ? 'text-xl md:text-2xl font-serif' : 'text-base'}`}>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              {article.title}
            </a>
          </CardTitle>
          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {article.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {article.description.replace(/<[^>]*>/g, '')}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-normal">
            {article.source}
          </Badge>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(article.pubDate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
