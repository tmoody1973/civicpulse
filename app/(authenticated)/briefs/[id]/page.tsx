'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { EnhancedAudioPlayer } from '@/components/podcast/enhanced-audio-player';
import { ListenNowButton } from '@/components/audio/listen-now-button';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Bookmark, Download, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Brief as AudioBrief } from '@/contexts/audio-player-context';

interface Brief {
  id: string;
  title: string;
  featured_image_url: string | null;
  audio_url: string;
  transcript: string;
  written_digest: string;
  duration: number;
  policy_areas: string[];
  generated_at: string;
  type: 'daily' | 'weekly';
}

export default function BriefDetailPage() {
  const params = useParams();
  const briefId = params.id as string;
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (briefId) {
      fetchBrief();
    }
  }, [briefId]);

  const fetchBrief = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/briefs/${briefId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch brief');
      }

      const data = await response.json();
      setBrief(data.brief);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brief');
      console.error('Error fetching brief:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // TODO: Implement save/bookmark functionality
    console.log('Save brief:', briefId);
  };

  const handleDownload = () => {
    if (brief) {
      const link = document.createElement('a');
      link.href = brief.audio_url;
      link.download = `${brief.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (brief && navigator.share) {
      try {
        await navigator.share({
          title: brief.title,
          text: `Check out this congressional brief: ${brief.title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
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

  if (error || !brief) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Brief</h2>
          <p className="text-muted-foreground mb-6">{error || 'Brief not found'}</p>
          <Button asChild>
            <a href="/briefs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Briefs
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild>
            <a href="/briefs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Briefs
            </a>
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Featured Image */}
          {brief.featured_image_url && (
            <div className="relative w-full aspect-video mb-6 rounded-lg overflow-hidden">
              <Image
                src={brief.featured_image_url}
                alt={brief.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Policy Area Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {brief.policy_areas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary"
              >
                {area}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold mb-4">{brief.title}</h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-muted-foreground mb-6">
            <span>{formatDate(brief.generated_at)}</span>
            <span>•</span>
            <span>{Math.floor(brief.duration / 60)} min read</span>
            <span>•</span>
            <span className="capitalize">{brief.type} Brief</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-8">
            <ListenNowButton
              brief={{
                id: brief.id,
                title: brief.title,
                audio_url: brief.audio_url,
                featured_image_url: brief.featured_image_url,
                duration: brief.duration,
                type: brief.type,
                generated_at: brief.generated_at,
              }}
              variant="default"
              size="default"
            />
            <Button onClick={handleSave} variant="outline">
              <Bookmark className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleShare} variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Audio Player */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <EnhancedAudioPlayer
                audioUrl={brief.audio_url}
                title={brief.title}
                // Don't pass transcript - briefs don't have timestamped segments
              />

              {/* Show Transcript Button (like test player) */}
              {brief.transcript && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTranscript(!showTranscript)}
                  >
                    {showTranscript ? 'Hide' : 'Show'} Transcript
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcript Section (hidden by default) */}
          {showTranscript && brief.transcript && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {brief.transcript}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Written Digest */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown>{brief.written_digest}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
