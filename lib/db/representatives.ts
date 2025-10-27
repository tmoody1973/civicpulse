/**
 * Database helpers for managing representatives
 *
 * Handles saving legislators from Geocodio API to Raindrop SQL
 * and linking them to user profiles.
 */

import type { Legislator } from '@/lib/api/geocodio';
import { extractStateFromAddress, extractDistrictNumber, extractStateFromOcdId } from '@/lib/api/geocodio';

// UUID generation helper
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Save legislators from Geocodio to database
 *
 * Uses INSERT OR REPLACE to update existing representatives
 * Returns array of bioguide IDs
 *
 * @param legislators - Array of legislators from Geocodio
 * @param fetch - Raindrop fetch function for SQL queries
 * @returns Array of bioguide IDs
 */
export async function saveLegislatorsToDatabase(
  legislators: Legislator[],
  fetch: Function
): Promise<string[]> {
  const savedIds: string[] = [];

  for (const legislator of legislators) {
    const bioguideId = legislator.references.bioguide_id;

    // Prepare data
    const name = `${legislator.bio.first_name} ${legislator.bio.last_name}`;
    const chamber = legislator.type === 'representative' ? 'House' : 'Senate';

    // Extract state from address (e.g., "Washington DC 20515" → "DC")
    const state = extractStateFromAddress(legislator.contact.address);

    // Extract district number for House reps (null for Senators)
    let district = null;
    if (legislator.type === 'representative') {
      // Try to extract from the district name if available
      // For now, we'll leave it null and could enhance later
      district = null;
    }

    try {
      // Insert or update representative
      await fetch({
        method: 'POST',
        body: JSON.stringify({
          query: `
            INSERT OR REPLACE INTO representatives (
              bioguide_id, name, first_name, last_name, party, state, district, chamber,
              image_url, official_url, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
          params: [
            bioguideId,
            name,
            legislator.bio.first_name,
            legislator.bio.last_name,
            legislator.bio.party,
            state,
            district,
            chamber,
            legislator.bio.photo_url,
            legislator.contact.url
          ]
        })
      });

      savedIds.push(bioguideId);
    } catch (error) {
      console.error(`Error saving legislator ${bioguideId}:`, error);
      throw error;
    }
  }

  return savedIds;
}

/**
 * Link user to their representatives
 *
 * Uses INSERT OR IGNORE to prevent duplicates
 *
 * @param userId - User ID
 * @param bioguideIds - Array of representative bioguide IDs
 * @param fetch - Raindrop fetch function
 */
export async function linkUserToRepresentatives(
  userId: string,
  bioguideIds: string[],
  fetch: Function
): Promise<void> {
  for (const bioguideId of bioguideIds) {
    try {
      await fetch({
        method: 'POST',
        body: JSON.stringify({
          query: `
            INSERT OR IGNORE INTO user_representatives (user_id, bioguide_id)
            VALUES (?, ?)
          `,
          params: [userId, bioguideId]
        })
      });
    } catch (error) {
      console.error(`Error linking user ${userId} to rep ${bioguideId}:`, error);
      throw error;
    }
  }
}

/**
 * Get user's representatives
 *
 * Returns all 3 representatives (1 House + 2 Senate)
 *
 * @param userId - User ID
 * @param fetch - Raindrop fetch function
 * @returns Array of representatives
 */
export async function getUserRepresentatives(
  userId: string,
  fetch: Function
) {
  try {
    const response = await fetch({
      method: 'POST',
      body: JSON.stringify({
        query: `
          SELECT r.*
          FROM representatives r
          INNER JOIN user_representatives ur ON r.bioguide_id = ur.bioguide_id
          WHERE ur.user_id = ?
          ORDER BY r.chamber DESC, r.name
        `,
        params: [userId]
      })
    });

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error getting representatives for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get representative by bioguide ID
 *
 * @param bioguideId - Bioguide ID
 * @param fetch - Raindrop fetch function
 * @returns Representative data or null
 */
export async function getRepresentativeByBioguideId(
  bioguideId: string,
  fetch: Function
) {
  try {
    const response = await fetch({
      method: 'POST',
      body: JSON.stringify({
        query: `
          SELECT * FROM representatives
          WHERE bioguide_id = ?
          LIMIT 1
        `,
        params: [bioguideId]
      })
    });

    const data = await response.json();
    return data.results?.[0] || null;
  } catch (error) {
    console.error(`Error getting representative ${bioguideId}:`, error);
    throw error;
  }
}

/**
 * Update user's ZIP code and congressional district
 *
 * @param userId - User ID
 * @param zipCode - ZIP code
 * @param state - State abbreviation
 * @param district - District number
 * @param fetch - Raindrop fetch function
 */
export async function updateUserLocation(
  userId: string,
  zipCode: string,
  state: string,
  district: number | null,
  fetch: Function
): Promise<void> {
  try {
    await fetch({
      method: 'POST',
      body: JSON.stringify({
        query: `
          UPDATE users
          SET
            state = ?,
            district = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        params: [state, district, userId]
      })
    });
  } catch (error) {
    console.error(`Error updating location for user ${userId}:`, error);
    throw error;
  }
}
