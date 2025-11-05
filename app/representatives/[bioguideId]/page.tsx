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
import { getRepresentativeData } from '@/lib/congress/get-representative-data';

// Force dynamic rendering since we need session cookies
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    bioguideId: string;
  }>;
}

export default async function RepresentativePage({ params }: PageProps) {
  // Next.js 16: params must be awaited
  const { bioguideId } = await params;

  // Check authentication - temporarily moved after params await to isolate any auth issues
  const user = await getSession();
  if (!user) {
    redirect('/auth/login');
  }

  // Fetch representative data directly from database (no self-referential API call)
  console.log(`[RepPage] Fetching representative data for ${bioguideId}`);
  const data = await getRepresentativeData(bioguideId);

  // Handle 404
  if (!data) {
    console.log(`[RepPage] Representative ${bioguideId} not found`);
    notFound();
  }

  console.log(`[RepPage] Successfully loaded data for ${data.representative?.name || bioguideId}`);
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
  // Skip auth check here - metadata generation shouldn't require authentication
  // The page component already checks authentication

  // Next.js 16: params must be awaited
  const { bioguideId } = await params;

  // Temporarily return simple metadata to isolate if metadata generation is causing 500 errors
  console.log(`[RepPage Metadata] Generating metadata for ${bioguideId}`);

  try {
    // Use the same shared function for consistency
    const data = await getRepresentativeData(bioguideId);

    if (!data) {
      console.log(`[RepPage Metadata] No data found for ${bioguideId}`);
      return {
        title: 'Representative Not Found | HakiVo',
      };
    }

    const { representative, stats } = data;
    const chamberText = representative.chamber === 'house' ? 'Representative' : 'Senator';
    const location = representative.district
      ? `${representative.state}-${representative.district}`
      : representative.state;

    console.log(`[RepPage Metadata] Successfully generated metadata for ${representative.name}`);
    return {
      title: `${representative.name} - ${chamberText} (${representative.party}) | HakiVo`,
      description: `View legislative activity for ${representative.name}, ${representative.party} ${chamberText} from ${location}. ${stats.totalSponsored} bills sponsored, ${stats.totalCosponsored} co-sponsored, ${stats.lawsPassed} laws passed.`,
      openGraph: {
        title: `${representative.name} - ${chamberText}`,
        description: `${stats.totalSponsored} bills sponsored, ${stats.totalCosponsored} co-sponsored, ${stats.lawsPassed} laws passed`,
        images: representative.imageUrl ? [representative.imageUrl] : [],
      },
    };
  } catch (error) {
    console.error('[RepPage Metadata] Error generating metadata:', error);
    return {
      title: 'Representative | HakiVo',
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
