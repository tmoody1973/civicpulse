'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VotingHistory } from './voting-history';
import { PressReleases } from '../representative/press-releases';

interface ActivityTabsProps {
  bioguideId: string;
  chamber: 'house' | 'senate';
  votesLimit?: number;
  pressLimit?: number;
}

export function ActivityTabs({
  bioguideId,
  chamber,
  votesLimit = 10,
  pressLimit = 5
}: ActivityTabsProps) {
  return (
    <Tabs defaultValue="votes" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="votes">Recent Votes</TabsTrigger>
        <TabsTrigger value="press">Press Releases</TabsTrigger>
      </TabsList>

      <TabsContent value="votes" className="mt-4">
        <VotingHistory bioguideId={bioguideId} chamber={chamber} limit={votesLimit} />
      </TabsContent>

      <TabsContent value="press" className="mt-4">
        <PressReleases bioguideId={bioguideId} limit={pressLimit} />
      </TabsContent>
    </Tabs>
  );
}
