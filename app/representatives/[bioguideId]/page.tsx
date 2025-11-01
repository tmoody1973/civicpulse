/**
 * Representative Detail Page
 *
 * Dynamic route for displaying comprehensive information about a specific representative
 * including their profile, legislative activity, and sponsored bills.
 *
 * Route: /representatives/[bioguideId]
 * Example: /representatives/W000817 (Elizabeth Warren)
 */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RepresentativeHeader } from '@/components/representatives/representative-header';
import { QuickStats } from '@/components/representatives/quick-stats';
import { LegislationTabs } from '@/components/representatives/legislation-tabs';
import { AppHeader } from '@/components/shared/app-header';
import { getSession } from '@/lib/auth/session';

interface PageProps {
  params: Promise<{
    bioguideId: string;
  }>;
}

async function getRepresentativeData(bioguideId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(
      `${baseUrl}/api/representatives/${bioguideId}`,
      {
        // Revalidate every 12 hours (representatives data doesn't change often)
        next: { revalidate: 43200 }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch representative data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching representative:', error);
    throw error;
  }
}

export default async function RepresentativePage({ params }: PageProps) {
  // Check authentication
  const user = await getSession();
  if (!user) {
    redirect('/auth/login');
  }

  // Next.js 16: params must be awaited
  const { bioguideId } = await params;

  // Fetch representative data
  const data = await getRepresentativeData(bioguideId);

  // Handle 404
  if (!data) {
    notFound();
  }

  const { representative, sponsoredBills, cosponsoredBills, stats } = data;

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Navigation breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-2">
                <Home className="w-4 h-4" />
                Home
              </Link>
            </Button>
            <span className="text-gray-400">/</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Search
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Representative profile header */}
          <RepresentativeHeader representative={representative} />

          {/* Quick statistics */}
          <QuickStats stats={stats} />

          {/* Legislation tabs (Sponsored + Co-Sponsored) */}
          <LegislationTabs
            sponsoredBills={sponsoredBills}
            cosponsoredBills={cosponsoredBills || []}
          />
        </div>
      </div>
    </div>
    </>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  // Check authentication
  const user = await getSession();
  if (!user) {
    return {
      title: 'Sign In Required | Civic Pulse',
    };
  }

  // Next.js 16: params must be awaited
  const { bioguideId } = await params;

  try {
    const data = await getRepresentativeData(bioguideId);

    if (!data) {
      return {
        title: 'Representative Not Found | Civic Pulse',
      };
    }

    const { representative, stats } = data;
    const chamberText = representative.chamber === 'house' ? 'Representative' : 'Senator';
    const location = representative.district
      ? `${representative.state}-${representative.district}`
      : representative.state;

    return {
      title: `${representative.name} - ${chamberText} (${representative.party}) | Civic Pulse`,
      description: `View legislative activity for ${representative.name}, ${representative.party} ${chamberText} from ${location}. ${stats.totalSponsored} bills sponsored, ${stats.totalCosponsored} co-sponsored, ${stats.lawsPassed} laws passed.`,
      openGraph: {
        title: `${representative.name} - ${chamberText}`,
        description: `${stats.totalSponsored} bills sponsored, ${stats.totalCosponsored} co-sponsored, ${stats.lawsPassed} laws passed`,
        images: representative.imageUrl ? [representative.imageUrl] : [],
      },
    };
  } catch (error) {
    return {
      title: 'Representative | Civic Pulse',
    };
  }
}

// Generate static params for the most active representatives (optional optimization)
// This pre-renders pages for top representatives at build time
export async function generateStaticParams() {
  // For now, return empty array to use dynamic rendering
  // In production, you could fetch top 100 most active representatives
  // and pre-render their pages
  return [];
}
