import { Header } from '@/components/landing/header';
import { HeroSection } from '@/components/landing/hero-section';
import { HowItWorks } from '@/components/landing/how-it-works';
import { BillExample } from '@/components/landing/bill-example';
import { Footer } from '@/components/landing/footer';
import { PodcastGenerator } from '@/components/podcast-generator';

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <HeroSection />
        <HowItWorks />

        {/* Podcast Generation Demo */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto flex justify-center">
            <PodcastGenerator />
          </div>
        </section>

        <BillExample />
      </main>
      <Footer />
    </>
  );
}
