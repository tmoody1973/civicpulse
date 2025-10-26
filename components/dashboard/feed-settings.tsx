'use client';

import { useState } from 'react';
import { Settings, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { THE_HILL_FEEDS, type RSSFeed } from '@/lib/rss/the-hill-feeds';

interface FeedSettingsProps {
  selectedFeedIds: string[];
  onSave: (feedIds: string[]) => void;
  trigger?: React.ReactNode;
}

export function FeedSettings({ selectedFeedIds, onSave, trigger }: FeedSettingsProps) {
  const [open, setOpen] = useState(false);
  const [activeFeedIds, setActiveFeedIds] = useState<Set<string>>(
    new Set(selectedFeedIds)
  );

  const generalFeeds = THE_HILL_FEEDS.filter(feed => feed.category === 'news');
  const policyFeeds = THE_HILL_FEEDS.filter(feed => feed.category === 'policy');

  const toggleFeed = (feedId: string) => {
    const newFeeds = new Set(activeFeedIds);
    if (newFeeds.has(feedId)) {
      newFeeds.delete(feedId);
    } else {
      newFeeds.add(feedId);
    }
    setActiveFeedIds(newFeeds);
  };

  const handleSave = () => {
    onSave(Array.from(activeFeedIds));
    setOpen(false);
  };

  const handleCancel = () => {
    setActiveFeedIds(new Set(selectedFeedIds));
    setOpen(false);
  };

  const activeCount = activeFeedIds.size;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Customize Feeds
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Customize News Feeds</span>
            <Badge variant="secondary">{activeCount} feeds selected</Badge>
          </DialogTitle>
          <DialogDescription>
            Choose which news feeds from The Hill you want to see on your dashboard.
            You can always change this later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* General Feeds Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              General Congressional News
              <Badge variant="outline" className="text-xs font-normal">
                Recommended for everyone
              </Badge>
            </h3>
            <div className="space-y-3">
              {generalFeeds.map(feed => (
                <FeedToggleItem
                  key={feed.id}
                  feed={feed}
                  isActive={activeFeedIds.has(feed.id)}
                  onToggle={toggleFeed}
                  recommended
                />
              ))}
            </div>
          </div>

          {/* Policy Feeds Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Policy Area Feeds
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Select specific policy areas you want to track. These feeds provide in-depth coverage
              of congressional activity in each area.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {policyFeeds.map(feed => (
                <FeedToggleItem
                  key={feed.id}
                  feed={feed}
                  isActive={activeFeedIds.has(feed.id)}
                  onToggle={toggleFeed}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FeedToggleItemProps {
  feed: RSSFeed;
  isActive: boolean;
  onToggle: (feedId: string) => void;
  recommended?: boolean;
}

function FeedToggleItem({ feed, isActive, onToggle, recommended }: FeedToggleItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1">
        <Label
          htmlFor={`feed-${feed.id}`}
          className="text-sm font-medium cursor-pointer flex items-center gap-2"
        >
          {feed.name}
          {recommended && (
            <Badge variant="secondary" className="text-xs font-normal">
              Recommended
            </Badge>
          )}
        </Label>
      </div>
      <Switch
        id={`feed-${feed.id}`}
        checked={isActive}
        onCheckedChange={() => onToggle(feed.id)}
      />
    </div>
  );
}
