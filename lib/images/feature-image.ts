/**
 * Feature Image Resolver
 *
 * Smart image resolution for news articles, bills, and representatives.
 * Uses a priority system: OG images → Representative photos → Policy icons → Default
 */

import { extractOGImage } from './og-extractor';

/**
 * Policy area to icon mapping
 * These should be SVG icons in /public/images/policy-icons/
 */
const POLICY_AREA_ICONS: Record<string, string> = {
  'Health': '/images/policy-icons/healthcare.svg',
  'Healthcare': '/images/policy-icons/healthcare.svg',
  'Environmental Protection': '/images/policy-icons/climate.svg',
  'Climate': '/images/policy-icons/climate.svg',
  'Education': '/images/policy-icons/education.svg',
  'Armed Forces and National Security': '/images/policy-icons/defense.svg',
  'Defense': '/images/policy-icons/defense.svg',
  'Economics and Public Finance': '/images/policy-icons/economy.svg',
  'Economy': '/images/policy-icons/economy.svg',
  'Commerce': '/images/policy-icons/business.svg',
  'Business': '/images/policy-icons/business.svg',
  'Science, Technology, Communications': '/images/policy-icons/technology.svg',
  'Technology': '/images/policy-icons/technology.svg',
  'Science': '/images/policy-icons/technology.svg',
  'International Affairs': '/images/policy-icons/international.svg',
  'Immigration': '/images/policy-icons/immigration.svg',
  'Labor and Employment': '/images/policy-icons/labor.svg',
  'Transportation and Public Works': '/images/policy-icons/transportation.svg',
  'Transportation': '/images/policy-icons/transportation.svg',
  'Agriculture and Food': '/images/policy-icons/agriculture.svg',
  'Agriculture': '/images/policy-icons/agriculture.svg',
  'Housing': '/images/policy-icons/housing.svg',
  'Taxation': '/images/policy-icons/taxes.svg',
  'Taxes': '/images/policy-icons/taxes.svg',
  'Crime and Law Enforcement': '/images/policy-icons/law-enforcement.svg',
  'Social Security and Welfare': '/images/policy-icons/social-security.svg',
  'Social': '/images/policy-icons/social-security.svg',
  'Civil Rights and Liberties': '/images/policy-icons/civil-rights.svg',
  'Civil Rights': '/images/policy-icons/civil-rights.svg',
};

const DEFAULT_ICON = '/images/policy-icons/default.svg';

/**
 * Get Congress.gov official photo URL for a representative
 * Format: https://bioguide.congress.gov/bioguide/photo/[FIRST_LETTER]/[BIOGUIDE_ID].jpg
 */
export function getRepresentativePhotoUrl(bioguideId: string): string {
  if (!bioguideId || bioguideId.length === 0) {
    return DEFAULT_ICON;
  }

  const firstLetter = bioguideId[0].toUpperCase();
  return `https://bioguide.congress.gov/bioguide/photo/${firstLetter}/${bioguideId}.jpg`;
}

/**
 * Get policy area icon URL
 */
export function getPolicyAreaIcon(policyArea: string): string {
  return POLICY_AREA_ICONS[policyArea] || DEFAULT_ICON;
}

/**
 * Get feature image for a news article
 * Priority: OG image → Policy area icon → Default
 */
export async function getNewsArticleImage(article: {
  source_url: string;
  policy_area: string;
}): Promise<string> {
  // Try to extract OG image from article URL
  const ogImage = await extractOGImage(article.source_url);
  if (ogImage) {
    return ogImage;
  }

  // Fallback to policy area icon
  return getPolicyAreaIcon(article.policy_area);
}

/**
 * Get feature image for a bill
 * Priority: Sponsor photo → Policy area icon → Default
 */
export function getBillImage(bill: {
  sponsor_bioguide_id?: string | null;
  policy_area?: string | null;
  ai_policy_area?: string | null;
}): string {
  // Try sponsor photo first
  if (bill.sponsor_bioguide_id) {
    return getRepresentativePhotoUrl(bill.sponsor_bioguide_id);
  }

  // Fallback to policy area icon
  const policyArea = bill.policy_area || bill.ai_policy_area;
  if (policyArea) {
    return getPolicyAreaIcon(policyArea);
  }

  // Final fallback
  return DEFAULT_ICON;
}

/**
 * Get feature image for a representative
 */
export function getRepresentativeImage(representative: {
  bioguide_id: string;
}): string {
  return getRepresentativePhotoUrl(representative.bioguide_id);
}

/**
 * Batch resolve feature images for news articles
 * Processes OG image extraction in parallel
 */
export async function resolveNewsArticleImages(
  articles: Array<{ source_url: string; policy_area: string }>
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  // Extract OG images in parallel
  const results = await Promise.allSettled(
    articles.map(async (article) => {
      const ogImage = await extractOGImage(article.source_url);
      return { url: article.source_url, ogImage, policyArea: article.policy_area };
    })
  );

  // Map results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { url, ogImage, policyArea } = result.value;
      imageMap.set(
        url,
        ogImage || getPolicyAreaIcon(policyArea)
      );
    }
  }

  return imageMap;
}

/**
 * Universal feature image resolver
 * Accepts any content type and returns appropriate image
 */
export async function getFeatureImage(item: {
  type: 'news' | 'bill' | 'representative';
  source_url?: string;
  policy_area?: string | null;
  ai_policy_area?: string | null;
  sponsor_bioguide_id?: string | null;
  bioguide_id?: string;
}): Promise<string> {
  switch (item.type) {
    case 'news':
      if (item.source_url && item.policy_area) {
        return getNewsArticleImage({
          source_url: item.source_url,
          policy_area: item.policy_area,
        });
      }
      return DEFAULT_ICON;

    case 'bill':
      return getBillImage({
        sponsor_bioguide_id: item.sponsor_bioguide_id,
        policy_area: item.policy_area,
        ai_policy_area: item.ai_policy_area,
      });

    case 'representative':
      if (item.bioguide_id) {
        return getRepresentativeImage({ bioguide_id: item.bioguide_id });
      }
      return DEFAULT_ICON;

    default:
      return DEFAULT_ICON;
  }
}
