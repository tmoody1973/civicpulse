'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Step1Location } from '@/components/onboarding/step1-location';
import { Step2Interests } from '@/components/onboarding/step2-interests';
import { Step3Preferences } from '@/components/onboarding/step3-preferences';

interface OnboardingData {
  zipCode: string;
  interests: string[];
  emailNotifications: boolean;
  audioEnabled: boolean;
  audioFrequencies: ('daily' | 'weekly')[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    zipCode: '',
    interests: [],
    emailNotifications: true,
    audioEnabled: true, // Default to enabled
    audioFrequencies: ['daily', 'weekly'], // Both selected by default
  });

  const totalSteps = 3;

  const handleNext = (stepData: Partial<OnboardingData>) => {
    setData({ ...data, ...stepData });
    if (currentStep < totalSteps) {
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
    // TODO: Save to Raindrop backend via API
    console.log('Onboarding complete:', data);

    // For now, just redirect to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-background rounded-lg shadow-lg p-8">
          {currentStep === 1 && (
            <Step1Location
              initialData={{ zipCode: data.zipCode }}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && (
            <Step2Interests
              initialData={{ interests: data.interests }}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
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
