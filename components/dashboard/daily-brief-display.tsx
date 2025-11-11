'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Bookmark, Download } from 'lucide-react';
import { useAudioPlayer, type Brief } from '@/contexts/audio-player-context';
import { Button } from '@/components/ui/button';

interface BriefData {
  briefId: string;
  userId: string;
  type: string;
  generatedAt: string;
  duration: number;
  audioUrl: string;
  featureImageUrl: string | null;
  writtenDigest: string;
  billsCovered: Array<{
    id: string;
    billNumber: string;
    title: string;
    category: string;
    impactScore: number;
  }>;
  newsArticles: Array<{
    title: string;
    topic: string;
    url: string;
  }>;
  policyAreas: string[];
}

export function DailyBriefDisplay() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loadBrief } = useAudioPlayer();

  useEffect(() => {
    const fetchBrief = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/briefs/latest');
        const data = await response.json();

        if (data.success && data.brief) {
          setBrief(data.brief);
        } else {
          setError(data.message || 'No brief available');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load brief');
      } finally {
        setLoading(false);
      }
    };

    fetchBrief();
  }, []);

  const handlePlayBrief = () => {
    if (!brief) return;

    loadBrief({
      id: brief.briefId,
      title: `Daily Civic Brief - ${new Date(brief.generatedAt).toLocaleDateString()}`,
      audio_url: brief.audioUrl,
      featured_image_url: brief.featureImageUrl,
      duration: brief.duration,
      type: 'daily',
      policy_areas: brief.policyAreas,
      generated_at: brief.generatedAt,
      written_digest: brief.writtenDigest,
    });
  };

  const handleDownload = () => {
    if (!brief) return;
    window.open(brief.audioUrl, '_blank');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateCreativeHeadline = (policyAreas: string[], digest: string): string => {
    // Generate creative, engaging headlines based on policy areas and content
    const area = policyAreas[0] || 'policy';
    const date = new Date(brief?.generatedAt || Date.now());
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    // Extract key topics from digest
    const hasEducation = digest.toLowerCase().includes('education');
    const hasHealthcare = digest.toLowerCase().includes('health');
    const hasTech = digest.toLowerCase().includes('tech') || digest.toLowerCase().includes('ai');
    const hasClimate = digest.toLowerCase().includes('climate') || digest.toLowerCase().includes('environment');

    const headlines = {
      education: [
        `${dayName}'s Education Breakthrough: What You Need to Know`,
        'The Future of Learning: Today\'s Legislative Updates',
        'Education Reform Takes Center Stage in Congress'
      ],
      health: [
        'Healthcare on the Hill: Critical Updates from Capitol Hill',
        `${dayName}'s Health Policy Roundup`,
        'Your Health, Your Voice: Today\'s Congressional Actions'
      ],
      technology: [
        'Tech Policy Moves Fast: Here\'s What Happened Today',
        'Innovation Meets Legislation: Today\'s Tech Updates',
        'Digital Rights and Regulations: Today\'s Key Decisions'
      ],
      climate: [
        'Climate Action Update: Progress on Capitol Hill',
        'Environmental Policy Shifts: What Changed Today',
        'Sustainability in Focus: Today\'s Legislative Moves'
      ],
      default: [
        `${dayName}'s Capitol Hill Briefing: The Stories That Matter`,
        'Your Daily Dose of Democracy in Action',
        'Legislative Updates That Impact Your Life',
        'Today\'s Most Important Congressional Decisions',
        'Democracy Digest: What Happened on the Hill Today'
      ]
    };

    // Select headline based on primary policy area
    const areaHeadlines = headlines[area as keyof typeof headlines] || headlines.default;
    return areaHeadlines[0];
  };

  const extractExcerpt = (digest: string): string => {
    // Extract first paragraph after headline
    const lines = digest.split('\n');
    const headlineIndex = lines.findIndex(line => line.startsWith('### '));
    if (headlineIndex >= 0) {
      for (let i = headlineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('!')) {
          return line;
        }
      }
    }
    return 'Stay informed with today\'s most important legislative updates';
  };

  const extractAuthor = (digest: string): string => {
    // Extract author from "by [name]" pattern
    const authorMatch = digest.match(/by (.+?)(?:\n|$)/);
    return authorMatch ? authorMatch[1] : 'Civic Pulse AI';
  };

  const extractCategory = (policyAreas: string[]): string => {
    return policyAreas.length > 0
      ? policyAreas[0].charAt(0).toUpperCase() + policyAreas[0].slice(1)
      : 'Policy';
  };

  const getFeatureImage = (): string => {
    // Priority 1: featured_image_url from database (OG image from story)
    if (brief?.featureImageUrl) return brief.featureImageUrl;

    // Priority 2: Extract first image from markdown (story images)
    const imageMatch = brief?.writtenDigest.match(/!\[.*?\]\((.*?)\)/);
    if (imageMatch && imageMatch[1]) return imageMatch[1];

    // Fallback: Placeholder
    return '/placeholder-brief.jpg';
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted-foreground">Loading your daily brief...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !brief) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <p className="text-muted-foreground">
            {error || 'No daily brief available yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Generate your first brief using the button in the Podcast Queue section
          </p>
        </div>
      </Card>
    );
  }

  const headline = generateCreativeHeadline(brief.policyAreas, brief.writtenDigest);
  const excerpt = extractExcerpt(brief.writtenDigest);
  const author = extractAuthor(brief.writtenDigest);
  const category = extractCategory(brief.policyAreas);
  const featureImage = getFeatureImage();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <a href={`/briefs/${brief.briefId}`} className="flex flex-col md:flex-row">
        {/* Feature Image */}
        <div className="w-full md:w-2/5 lg:w-1/3 relative">
          <div className="aspect-[4/3] md:aspect-auto md:h-full relative">
            <img
              src={featureImage}
              alt={headline}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
          {/* Header */}
          <div className="space-y-4">
            {/* Date and Time */}
            <div className="text-sm text-muted-foreground font-medium">
              Today's Daily Brief: {new Date(brief.generatedAt).toLocaleString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </div>

            <h2 className="text-2xl md:text-3xl font-bold leading-tight">
              {headline}
            </h2>

            <div className="flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="capitalize">
                {category}
              </Badge>
              <span className="text-muted-foreground">by {author}</span>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {excerpt}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <Button
              onClick={(e) => {
                e.preventDefault();
                handlePlayBrief();
              }}
              size="lg"
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              Listen {formatDuration(brief.duration)}
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={(e) => e.preventDefault()}
            >
              <Bookmark className="w-4 h-4" />
              Save
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={(e) => {
                e.preventDefault();
                handleDownload();
              }}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      </a>
    </Card>
  );
}
