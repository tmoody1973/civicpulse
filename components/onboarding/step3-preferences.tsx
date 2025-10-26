'use client';

import { useState } from 'react';
import { Bell, Headphones, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Step3Props {
  initialData: {
    emailNotifications: boolean;
    audioEnabled: boolean;
    audioFrequencies: ('daily' | 'weekly')[];
  };
  onNext: (data: {
    emailNotifications: boolean;
    audioEnabled: boolean;
    audioFrequencies: ('daily' | 'weekly')[];
  }) => void;
  onBack: () => void;
}

export function Step3Preferences({ initialData, onNext, onBack }: Step3Props) {
  const [emailNotifications, setEmailNotifications] = useState(initialData.emailNotifications);
  const [audioEnabled, setAudioEnabled] = useState(initialData.audioEnabled);
  const [audioFrequencies, setAudioFrequencies] = useState<('daily' | 'weekly')[]>(initialData.audioFrequencies);

  const toggleFrequency = (freq: 'daily' | 'weekly') => {
    setAudioFrequencies(prev =>
      prev.includes(freq)
        ? prev.filter(f => f !== freq)
        : [...prev, freq]
    );
  };

  const handleSubmit = () => {
    onNext({
      emailNotifications,
      audioEnabled,
      audioFrequencies: audioEnabled ? audioFrequencies : [],
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Bell className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">How would you like to stay informed?</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose how you want to receive updates about bills and congressional activity. You can change these preferences anytime.
        </p>
      </div>

      <div className="space-y-4 max-w-lg mx-auto">
        {/* Email notifications */}
        <div className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="email"
                  checked={emailNotifications}
                  onCheckedChange={(checked) => setEmailNotifications(checked as boolean)}
                />
                <Label htmlFor="email" className="text-base font-semibold cursor-pointer">
                  Email Updates
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Get notified when bills you're tracking have updates, votes, or changes in status.
              </p>
            </div>
          </div>
        </div>

        {/* Audio briefings */}
        <div className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Headphones className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="audio"
                  checked={audioEnabled}
                  onCheckedChange={(checked) => setAudioEnabled(checked as boolean)}
                />
                <Label htmlFor="audio" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                  Audio Briefings
                  <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Optional
                  </span>
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Listen to NPR-quality audio summaries of bills and congressional activity. Perfect for your commute! Select one or both.
              </p>

              {audioEnabled && (
                <div className="ml-6 space-y-3 pt-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="daily"
                      checked={audioFrequencies.includes('daily')}
                      onCheckedChange={() => toggleFrequency('daily')}
                    />
                    <Label htmlFor="daily" className="font-normal cursor-pointer">
                      Daily briefings (5-7 minutes)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="weekly"
                      checked={audioFrequencies.includes('weekly')}
                      onCheckedChange={() => toggleFrequency('weekly')}
                    />
                    <Label htmlFor="weekly" className="font-normal cursor-pointer">
                      Weekly roundup (15-18 minutes)
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 max-w-sm mx-auto">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
          size="lg"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          className="flex-1"
          size="lg"
        >
          Complete Setup
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        You can customize all these settings later in your account preferences
      </div>
    </div>
  );
}
