'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, AlertCircle, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ZipCodeLookupProps {
  onSuccess: (data: {
    name?: string;
    zipCode: string;
    state: string;
    district: number;
    legislators: any[];
    city: string;
  }) => void;
}

export function ZipCodeLookup({ onSuccess }: ZipCodeLookupProps) {
  const [name, setName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's current name from the API
  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.name) {
            setName(data.name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate name (optional but recommended)
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

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
        name: name.trim(),
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
          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Your Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading || loadingUser}
              className="text-lg"
            />
            {loadingUser && (
              <p className="text-xs text-muted-foreground">
                Loading your profile...
              </p>
            )}
          </div>

          {/* ZIP Code field */}
          <div className="space-y-2">
            <Label htmlFor="zipCode">
              ZIP Code
            </Label>
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
