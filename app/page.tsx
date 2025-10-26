import { Header } from '@/components/landing/header';
import { HeroSection } from '@/components/landing/hero-section';
import { HowItWorks } from '@/components/landing/how-it-works';
import { BillExample } from '@/components/landing/bill-example';
import { Footer } from '@/components/landing/footer';

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <HeroSection />
        <HowItWorks />
        <BillExample />
      </main>
      <Footer />
    </>
  );
}
