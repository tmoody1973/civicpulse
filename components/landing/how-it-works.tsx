import { MapPin, CheckSquare, Bell } from 'lucide-react';

export function HowItWorks() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <StepCard
            number={1}
            icon={<MapPin className="w-6 h-6" />}
            title="Enter Your Location"
            description="We find your representatives automatically"
          />
          <StepCard
            number={2}
            icon={<CheckSquare className="w-6 h-6" />}
            title="Pick Your Issues"
            description="Healthcare, climate, economy, education, etc."
          />
          <StepCard
            number={3}
            icon={<Bell className="w-6 h-6" />}
            title="Stay Informed"
            description="Get bill updates, voting records, and plain-English analysis"
          />
        </div>
      </div>
    </section>
  );
}

function StepCard({
  number,
  icon,
  title,
  description
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex flex-col items-center text-center p-6">
      {/* Step Number */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
        {number}
      </div>

      <div className="mt-8 mb-4 text-primary">
        {icon}
      </div>

      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
