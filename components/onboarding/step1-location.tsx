'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Step1Props {
  initialData: { zipCode: string };
  onNext: (data: { zipCode: string }) => void;
}

export function Step1Location({ initialData, onNext }: Step1Props) {
  const [zipCode, setZipCode] = useState(initialData.zipCode);
  const [error, setError] = useState('');

  const validateZipCode = (zip: string): boolean => {
    // US zip code validation (5 digits or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zip);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!zipCode.trim()) {
      setError('Please enter your zip code');
      return;
    }

    if (!validateZipCode(zipCode.trim())) {
      setError('Please enter a valid US zip code (e.g., 12345 or 12345-6789)');
      return;
    }

    setError('');
    onNext({ zipCode: zipCode.trim() });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">Where are you located?</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We'll use your zip code to find your congressional representatives and show you bills affecting your district.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="zipCode">Zip Code</Label>
          <Input
            id="zipCode"
            type="text"
            placeholder="e.g., 10001"
            value={zipCode}
            onChange={(e) => {
              setZipCode(e.target.value);
              setError('');
            }}
            className={error ? 'border-destructive' : ''}
            maxLength={10}
            autoFocus
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            We never share your location with third parties
          </p>
        </div>

        <Button type="submit" className="w-full" size="lg">
          Continue
        </Button>
      </form>

      <div className="pt-6 border-t">
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Why we need this</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Find your 2 senators and 1 representative</li>
            <li>✓ Show you bills affecting your congressional district</li>
            <li>✓ Track your representatives' voting records</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
