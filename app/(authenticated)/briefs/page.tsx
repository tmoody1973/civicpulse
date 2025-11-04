'use client';

import { useEffect, useState } from 'react';
import { BriefCard } from '@/components/briefs/brief-card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Brief {
  id: string;
  title: string;
  featured_image_url: string | null;
  audio_url: string;
  duration: number;
  policy_areas: string[];
  generated_at: string;
  type: 'daily' | 'weekly';
}

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBriefs();
  }, []);

  const fetchBriefs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/briefs');

      if (!response.ok) {
        throw new Error('Failed to fetch briefs');
      }

      const data = await response.json();
      setBriefs(data.briefs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load briefs');
      console.error('Error fetching briefs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (brief: Brief) => {
    // TODO: Implement save/bookmark functionality
    console.log('Save brief:', brief.id);
  };

  const handleDownload = async (brief: Brief) => {
    // Download the audio file
    const link = document.createElement('a');
    link.href = brief.audio_url;
    link.download = `${brief.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Briefs</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={fetchBriefs}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Group briefs by type
  const dailyBriefs = briefs.filter((b) => b.type === 'daily');
  const weeklyBriefs = briefs.filter((b) => b.type === 'weekly');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Your Congressional Briefs</h1>
        <p className="text-lg text-muted-foreground">
          Stay informed with AI-powered audio digests of legislation and news that matters to you
        </p>
      </div>

      {/* Daily Briefs Section */}
      {dailyBriefs.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Daily Briefs</h2>
            <Button variant="ghost" asChild>
              <a href="#daily">View All</a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dailyBriefs.map((brief) => (
              <BriefCard
                key={brief.id}
                id={brief.id}
                title={brief.title}
                featuredImage={
                  brief.featured_image_url || '/images/policy-icons/default.svg'
                }
                audioUrl={brief.audio_url}
                duration={brief.duration}
                policyAreas={brief.policy_areas}
                generatedAt={new Date(brief.generated_at)}
                type={brief.type}
                onSave={() => handleSave(brief)}
                onDownload={() => handleDownload(brief)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Weekly Briefs Section */}
      {weeklyBriefs.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Weekly Deep Dives</h2>
            <Button variant="ghost" asChild>
              <a href="#weekly">View All</a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {weeklyBriefs.map((brief) => (
              <BriefCard
                key={brief.id}
                id={brief.id}
                title={brief.title}
                featuredImage={
                  brief.featured_image_url || '/images/policy-icons/default.svg'
                }
                audioUrl={brief.audio_url}
                duration={brief.duration}
                policyAreas={brief.policy_areas}
                generatedAt={new Date(brief.generated_at)}
                type={brief.type}
                onSave={() => handleSave(brief)}
                onDownload={() => handleDownload(brief)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {briefs.length === 0 && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">No Briefs Yet</h2>
          <p className="text-muted-foreground mb-6">
            Your daily and weekly briefs will appear here once generated.
          </p>
          <Button asChild>
            <a href="/settings">Configure Your Preferences</a>
          </Button>
        </div>
      )}
    </div>
  );
}
