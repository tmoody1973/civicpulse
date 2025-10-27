/**
 * Representative Data Enrichment
 *
 * Enriches basic Congress.gov representative data with:
 * - Contact information (office address, phone)
 * - Social media accounts (Twitter, Facebook, YouTube, Instagram)
 *
 * Data sources:
 * - https://unitedstates.github.io/congress-legislators/legislators-current.json
 * - https://unitedstates.github.io/congress-legislators/legislators-social-media.json
 */

import { Representative } from './congress';

// Cache for the legislator data (avoid re-fetching on every request)
let legislatorsCache: any[] | null = null;
let socialMediaCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Fetch current legislators data from GitHub
 */
async function fetchLegislatorsData(): Promise<any[]> {
  const now = Date.now();

  // Return cached data if still fresh
  if (legislatorsCache && (now - cacheTimestamp < CACHE_DURATION)) {
    return legislatorsCache;
  }

  console.log('📥 Fetching legislators data from GitHub...');

  const response = await fetch(
    'https://unitedstates.github.io/congress-legislators/legislators-current.json'
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch legislators data: ${response.status}`);
  }

  legislatorsCache = await response.json();
  cacheTimestamp = now;

  console.log(`✅ Loaded ${legislatorsCache?.length || 0} legislators`);

  return legislatorsCache || [];
}

/**
 * Fetch legislators social media data from GitHub
 */
async function fetchSocialMediaData(): Promise<any[]> {
  const now = Date.now();

  // Return cached data if still fresh
  if (socialMediaCache && (now - cacheTimestamp < CACHE_DURATION)) {
    return socialMediaCache;
  }

  console.log('📥 Fetching social media data from GitHub...');

  const response = await fetch(
    'https://unitedstates.github.io/congress-legislators/legislators-social-media.json'
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch social media data: ${response.status}`);
  }

  socialMediaCache = await response.json();

  console.log(`✅ Loaded social media for ${socialMediaCache?.length || 0} legislators`);

  return socialMediaCache || [];
}

/**
 * Enrich a single representative with contact and social media data
 */
export async function enrichRepresentative(rep: Representative): Promise<Representative> {
  try {
    // Fetch both datasets
    const [legislatorsData, socialMediaData] = await Promise.all([
      fetchLegislatorsData(),
      fetchSocialMediaData(),
    ]);

    // Find matching legislator by bioguide ID
    const legislator = legislatorsData.find(
      (leg: any) => leg.id.bioguide === rep.bioguideId
    );

    // Find matching social media by bioguide ID
    const socialMedia = socialMediaData.find(
      (sm: any) => sm.id.bioguide === rep.bioguideId
    );

    // Get the most recent term info (terms are in chronological order)
    const currentTerm = legislator?.terms?.[legislator.terms.length - 1];

    // Enrich the representative data
    const enriched: Representative = {
      ...rep,
      // Contact information from legislators-current.json
      officeAddress: currentTerm?.address,
      officePhone: currentTerm?.phone,
      contactForm: currentTerm?.contact_form,
      websiteUrl: currentTerm?.url,
      rssUrl: currentTerm?.rss_url,
      // Social media from legislators-social-media.json
      twitterHandle: socialMedia?.social?.twitter,
      facebookUrl: socialMedia?.social?.facebook,
      youtubeUrl: socialMedia?.social?.youtube,
      instagramHandle: socialMedia?.social?.instagram,
    };

    return enriched;
  } catch (error) {
    console.error(`Failed to enrich representative ${rep.bioguideId}:`, error);
    // Return original data if enrichment fails (graceful degradation)
    return rep;
  }
}

/**
 * Enrich multiple representatives with contact and social media data
 */
export async function enrichRepresentatives(reps: Representative[]): Promise<Representative[]> {
  console.log(`🔍 Enriching ${reps.length} representatives with contact and social media data...`);

  try {
    // Fetch both datasets once for all representatives
    const [legislatorsData, socialMediaData] = await Promise.all([
      fetchLegislatorsData(),
      fetchSocialMediaData(),
    ]);

    // Enrich all representatives
    const enriched = reps.map((rep) => {
      // Find matching legislator by bioguide ID
      const legislator = legislatorsData.find(
        (leg: any) => leg.id.bioguide === rep.bioguideId
      );

      // Find matching social media by bioguide ID
      const socialMedia = socialMediaData.find(
        (sm: any) => sm.id.bioguide === rep.bioguideId
      );

      // Get the most recent term info
      const currentTerm = legislator?.terms?.[legislator.terms.length - 1];

      return {
        ...rep,
        // Contact information
        officeAddress: currentTerm?.address,
        officePhone: currentTerm?.phone,
        contactForm: currentTerm?.contact_form,
        websiteUrl: currentTerm?.url,
        rssUrl: currentTerm?.rss_url,
        // Social media
        twitterHandle: socialMedia?.social?.twitter,
        facebookUrl: socialMedia?.social?.facebook,
        youtubeUrl: socialMedia?.social?.youtube,
        instagramHandle: socialMedia?.social?.instagram,
      };
    });

    console.log(`✅ Successfully enriched ${enriched.length} representatives`);

    return enriched;
  } catch (error) {
    console.error('Failed to enrich representatives:', error);
    // Return original data if enrichment fails
    return reps;
  }
}
