'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZipCodeLookup } from '@/components/onboarding/zip-code-lookup';
import { RepresentativeCards } from '@/components/onboarding/representative-cards';
import { Step2Interests } from '@/components/onboarding/step2-interests';
import { Step3Preferences } from '@/components/onboarding/step3-preferences';
import { ProgressIndicator } from '@/components/shared/progress-indicator';
import { CheckCircle2 } from 'lucide-react';

interface LookupResult {
  name?: string;
  zipCode: string;
  city: string;
  state: string;
  district: number;
  legislators: any[];
}

interface OnboardingData {
  name?: string;
  zipCode: string;
  city?: string;
  state?: string;
  district?: number;
  legislators?: any[];
  interests: string[];
  emailNotifications: boolean;
  audioEnabled: boolean;
  audioFrequencies: ('daily' | 'weekly')[];
}

const TOTAL_STEPS = 4; // ZIP lookup, Representative review, Interests, Preferences
const INITIAL_ONBOARDING_DATA: OnboardingData = {
  zipCode: '',
  interests: [],
  emailNotifications: true,
  audioEnabled: true,
  audioFrequencies: ['daily', 'weekly'],
};

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);

  const handleLookupSuccess = (result: LookupResult) => {
    setData({
      ...data,
      name: result.name,
      zipCode: result.zipCode,
      city: result.city,
      state: result.state,
      district: result.district,
      legislators: result.legislators,
    });
    setCurrentStep(2); // Move to representative review
  };

  const handleNext = (stepData: Partial<OnboardingData>) => {
    setData({ ...data, ...stepData });
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding - save to backend and redirect to dashboard
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      // Save onboarding data to backend via API
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          zipCode: data.zipCode,
          state: data.state,
          district: data.district,
          interests: data.interests,
          emailNotifications: data.emailNotifications,
          audioEnabled: data.audioEnabled,
          audioFrequencies: data.audioFrequencies,
          representatives: data.legislators, // Send representatives to save to DB
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save onboarding data:', error);
        // Still redirect even if save fails (graceful degradation)
      } else {
        const result = await response.json();
        console.log('Onboarding saved successfully:', result);
        // TODO: Store userId in session/cookie
      }

      // Store user location in localStorage for dashboard use (until we have auth)
      if (data.state && data.district !== undefined) {
        localStorage.setItem('userLocation', JSON.stringify({
          state: data.state,
          district: data.district,
          zipCode: data.zipCode,
          city: data.city,
        }));
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Redirect anyway (graceful degradation)
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/logo.svg"
            alt="Civic Pulse"
            className="h-12 sm:h-16 w-auto"
          />
        </div>

        <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Step content */}
        <div className="bg-background rounded-lg shadow-lg p-8">
          {currentStep === 1 && (
            <ZipCodeLookup onSuccess={handleLookupSuccess} />
          )}

          {currentStep === 2 && data.legislators && (
            <div className="space-y-6">
              <RepresentativeCards
                representatives={data.legislators}
                location={{
                  city: data.city!,
                  state: data.state!,
                  district: data.district!.toString(),
                }}
                onContinue={() => setCurrentStep(3)}
              />
            </div>
          )}

          {currentStep === 3 && (
            <Step2Interests
              initialData={{ interests: data.interests }}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 4 && (
            <Step3Preferences
              initialData={{
                emailNotifications: data.emailNotifications,
                audioEnabled: data.audioEnabled,
                audioFrequencies: data.audioFrequencies,
              }}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
        </div>

        {/* Skip option */}
        {currentStep > 1 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip setup - I'll configure this later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
