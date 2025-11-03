'use client';

import { EnhancedAudioPlayer, type TranscriptSegment } from '@/components/podcast/enhanced-audio-player';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Sample transcript data for testing
const sampleTranscript: TranscriptSegment[] = [
  {
    timestamp: 0,
    speaker: 'sarah',
    text: 'Good morning, and welcome to your daily legislative brief. I\'m Sarah.',
  },
  {
    timestamp: 5,
    speaker: 'james',
    text: 'And I\'m James. Today we\'re covering some important developments in healthcare and technology policy.',
  },
  {
    timestamp: 15,
    speaker: 'sarah',
    text: 'Let\'s start with breaking news. According to The Hill, the Senate Health Committee advanced a major healthcare reform bill yesterday.',
    citation: {
      source: 'The Hill',
      url: 'https://thehill.com',
    },
  },
  {
    timestamp: 30,
    speaker: 'james',
    text: 'This bill, H.R. 2847, aims to expand Medicare coverage for prescription drugs. It passed committee with bipartisan support.',
  },
  {
    timestamp: 45,
    speaker: 'sarah',
    text: 'The impact could be significant for millions of Americans. The Congressional Budget Office estimates this could save beneficiaries an average of $500 per year.',
  },
  {
    timestamp: 60,
    speaker: 'james',
    text: 'Moving to technology policy, a new data privacy bill is making headlines. S. 1423, the American Data Privacy Act, was introduced in the Senate yesterday.',
  },
  {
    timestamp: 75,
    speaker: 'sarah',
    text: 'According to Politico, this bill would establish the first comprehensive federal data privacy framework, superseding state laws like California\'s CCPA.',
    citation: {
      source: 'Politico',
      url: 'https://politico.com',
    },
  },
  {
    timestamp: 95,
    speaker: 'james',
    text: 'We\'ll continue to follow both of these bills as they move through Congress. That\'s your brief for today.',
  },
  {
    timestamp: 105,
    speaker: 'sarah',
    text: 'Thanks for listening! Check back tomorrow for more updates.',
  },
];

export default function TestPlayerPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Enhanced Audio Player Test</h1>
        <p className="text-muted-foreground">
          Test the full-featured audio player with all controls and transcript functionality.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Brief - November 3, 2025</CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedAudioPlayer
            audioUrl="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
            title="Daily Brief - Healthcare & Technology Updates"
            transcript={sampleTranscript}
            onEnded={() => console.log('Audio ended!')}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Features Demonstrated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Playback Controls</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ Play/Pause button</li>
                <li>✓ Skip ±15 seconds</li>
                <li>✓ Playback speed (0.75x - 2x)</li>
                <li>✓ Volume control with mute</li>
                <li>✓ Seekable progress bar</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Advanced Features</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ Interactive transcript</li>
                <li>✓ Click timestamps to jump</li>
                <li>✓ Source citations in transcript</li>
                <li>✓ Current segment highlighting</li>
                <li>✓ Download audio button</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ Space: Play/Pause</li>
                <li>✓ ← Left: Skip back 15s</li>
                <li>✓ → Right: Skip forward 15s</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Mobile Features</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>✓ Media Session API</li>
                <li>✓ Lock screen controls</li>
                <li>✓ Background playback</li>
                <li>✓ Playback position saved</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-muted/30 rounded-lg text-sm">
        <p className="font-semibold mb-2">Testing Notes:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Using sample audio from SoundHelix for testing purposes</li>
          <li>• In production, replace with actual brief audio from Vultr CDN</li>
          <li>• Transcript includes sample news citations</li>
          <li>• Playback position is saved to localStorage</li>
          <li>• Test on mobile device to verify lock screen controls</li>
        </ul>
      </div>
    </div>
  );
}
