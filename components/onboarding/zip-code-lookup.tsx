'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ZipCodeLookupProps {
  onSuccess: (data: {
    zipCode: string;
    state: string;
    district: number;
    legislators: any[];
    city: string;
  }) => void;
}

export function ZipCodeLookup({ onSuccess }: ZipCodeLookupProps) {
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate ZIP code
    if (!/^\d{5}$/.test(zipCode)) {
      setError('Please enter a valid 5-digit ZIP code');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/onboarding/lookup-reps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zipCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to lookup representatives');
      }

      const data = await response.json();

      onSuccess({
        zipCode,
        state: data.district.state,
        district: data.district.number,
        legislators: data.representatives,
        city: data.city || data.district.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Find Your Representatives
        </CardTitle>
        <CardDescription>
          Enter your ZIP code to find your congressional representatives
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="zipCode" className="text-sm font-medium">
              ZIP Code
            </label>
            <Input
              id="zipCode"
              type="text"
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              placeholder="94102"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              className="text-lg"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || zipCode.length !== 5}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Looking up representatives...
              </>
            ) : (
              'Find My Representatives'
            )}
          </Button>
        </form>

        <div className="mt-6 text-xs text-muted-foreground">
          <p>We use your ZIP code to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Find your congressional district</li>
            <li>Identify your House representative</li>
            <li>Identify your two Senators</li>
            <li>Show relevant legislation</li>
          </ul>
          <p className="mt-2">
            Powered by <span className="font-semibold">Geocodio API</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
