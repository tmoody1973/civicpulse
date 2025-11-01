import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { FileText, Users, Lightbulb, Headphones } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative py-20 lg:py-32">
      <div className="container mx-auto px-4">
        {/* Hero Content */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          {/* Large Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.svg"
              alt="HakiVo - Making Congress Accessible"
              width={400}
              height={120}
              priority
              className="w-[250px] md:w-[350px] lg:w-[400px] h-auto dark:brightness-90"
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Know What Congress Is Doing
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Track bills, understand legislation, follow your representatives' votes, and stay informed—all in plain English
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding">
              <Button size="lg" className="text-lg px-8">
                Start Free
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Explore Features
            </Button>
          </div>

          {/* Social Proof */}
          <p className="mt-8 text-sm text-muted-foreground">
            Join 10,000+ informed citizens
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon={<FileText className="w-8 h-8" />}
            title="Track Bills"
            description="Follow legislation that matters to you"
          />
          <FeatureCard
            icon={<Lightbulb className="w-8 h-8" />}
            title="Plain English Summaries"
            description="AI transforms complex bills into clear explanations"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Know Your Reps"
            description="See how your representatives vote and what they sponsor"
          />
          <FeatureCard
            icon={<Headphones className="w-8 h-8" />}
            title="Audio Briefings"
            description="Listen to summaries on your commute (optional)"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
      <div className="mb-4 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
