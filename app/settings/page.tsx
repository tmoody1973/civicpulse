'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ClientHeader } from '@/components/shared/client-header';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Mail, Bell, User, Save, Loader2, Heart, Stethoscope, GraduationCap, Leaf, DollarSign, Shield, Home, Users, Cpu, Briefcase, Calculator, Globe, Truck, Sprout, Scale } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

// Maps to Congress.gov's Policy Areas for bill filtering
const ISSUE_CATEGORIES = [
  { id: 'healthcare', label: 'Healthcare', icon: Stethoscope, color: 'text-red-500' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: 'text-blue-500' },
  { id: 'science', label: 'Science & Research', icon: Users, color: 'text-purple-500' },
  { id: 'technology', label: 'Technology & Privacy', icon: Cpu, color: 'text-cyan-500' },
  { id: 'climate', label: 'Climate & Environment', icon: Leaf, color: 'text-green-500' },
  { id: 'economy', label: 'Economy & Jobs', icon: DollarSign, color: 'text-yellow-500' },
  { id: 'business', label: 'Business & Trade', icon: Briefcase, color: 'text-orange-500' },
  { id: 'taxes', label: 'Taxes & Budget', icon: Calculator, color: 'text-emerald-500' },
  { id: 'immigration', label: 'Immigration', icon: Globe, color: 'text-indigo-500' },
  { id: 'housing', label: 'Housing', icon: Home, color: 'text-amber-500' },
  { id: 'defense', label: 'Defense & Security', icon: Shield, color: 'text-slate-500' },
  { id: 'transportation', label: 'Transportation & Infrastructure', icon: Truck, color: 'text-gray-500' },
  { id: 'agriculture', label: 'Agriculture & Food', icon: Sprout, color: 'text-lime-500' },
  { id: 'social', label: 'Social Services', icon: Heart, color: 'text-pink-500' },
  { id: 'civil-rights', label: 'Civil Rights & Justice', icon: Scale, color: 'text-violet-500' },
];

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  zip_code: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  interests: string[];
  email_notifications: boolean;
  audio_enabled: boolean;
  audio_frequencies: string[];
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    zipCode: '',
    emailNotifications: false,
    audioEnabled: false,
    interests: [] as string[],
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/auth/login');
            return;
          }
          throw new Error('Failed to load profile');
        }
        const data = await response.json();
        setProfile(data);

        // Initialize form with current values
        setFormData({
          name: data.name || '',
          zipCode: data.zip_code || '',
          emailNotifications: data.email_notifications || false,
          audioEnabled: data.audio_enabled || false,
          interests: data.interests || [],
        });
      } catch (error) {
        console.error('Failed to load profile:', error);
        setMessage({ type: 'error', text: 'Failed to load settings' });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const toggleInterest = (id: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter(i => i !== id)
        : [...prev.interests, id]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          zipCode: formData.zipCode,
          emailNotifications: formData.emailNotifications,
          audioEnabled: formData.audioEnabled,
          interests: formData.interests,
          // Preserve other fields
          state: profile?.state,
          district: profile?.district,
          audioFrequencies: profile?.audio_frequencies || ['daily', 'weekly'],
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setMessage({ type: 'success', text: 'Settings saved successfully!' });

      // Reload profile to show updated data
      const profileResponse = await fetch('/api/user/profile');
      if (profileResponse.ok) {
        const data = await profileResponse.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientHeader />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and notification settings
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your basic account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
              <CardDescription>
                Your location determines which representatives and bills we show you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="Enter your ZIP code"
                  maxLength={5}
                />
              </div>

              {profile?.state && profile?.district && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{profile.state}</Badge>
                  <span>District {profile.district}</span>
                  {profile.city && <span>• {profile.city}</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Your Interests
              </CardTitle>
              <CardDescription>
                Select topics you care about. We'll prioritize relevant bills and updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.interests.length > 0 && (
                <p className="text-sm text-primary font-medium">
                  {formData.interests.length} {formData.interests.length === 1 ? 'topic' : 'topics'} selected
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ISSUE_CATEGORIES.map(({ id, label, icon: Icon, color }) => (
                  <div
                    key={id}
                    onClick={() => toggleInterest(id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer
                      ${formData.interests.includes(id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                    role="button"
                    tabIndex={0}
                    aria-pressed={formData.interests.includes(id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleInterest(id);
                      }
                    }}
                  >
                    <div className={`flex-shrink-0 ${color}`} aria-hidden="true">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 text-left font-medium text-sm">{label}</span>
                    <Checkbox
                      checked={formData.interests.includes(id)}
                      onCheckedChange={() => toggleInterest(id)}
                      aria-label={`Select ${label}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choose how you want to receive updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about bills and representatives
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="audioEnabled">Audio Briefings</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable personalized audio podcast briefings
                  </p>
                </div>
                <Switch
                  id="audioEnabled"
                  checked={formData.audioEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, audioEnabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
