/**
 * Representatives Database Tests
 *
 * Tests for saving and retrieving Geocodio legislator data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveLegislatorsToDatabase,
  linkUserToRepresentatives,
  getUserRepresentatives,
  getRepresentativeByBioguideId,
  updateUserLocation
} from '../representatives';
import type { Legislator } from '@/lib/api/geocodio';

// Mock fetch function
const mockFetch = vi.fn();

describe('Representatives Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveLegislatorsToDatabase', () => {
    it('should save single legislator to database', async () => {
      const legislators: Legislator[] = [
        {
          type: 'representative',
          bio: {
            last_name: 'Pelosi',
            first_name: 'Nancy',
            birthday: '1940-03-26',
            gender: 'F',
            party: 'Democratic',
            photo_url: 'https://www.congress.gov/img/member/p000197.jpg'
          },
          contact: {
            url: 'https://pelosi.house.gov',
            address: 'Washington DC 20515',
            phone: '(202) 225-4965',
            contact_form: null
          },
          social: {
            twitter: 'SpeakerPelosi',
            facebook: 'NancyPelosi',
            youtube: null
          },
          references: {
            bioguide_id: 'P000197',
            thomas_id: '00905',
            opensecrets_id: 'N00007360',
            lis_id: null,
            cspan_id: 6153,
            govtrack_id: 400314,
            votesmart_id: 26732,
            ballotpedia_id: 'Nancy Pelosi',
            washington_post_id: null,
            icpsr_id: 29547,
            wikipedia_id: 'Nancy Pelosi'
          },
          source: 'https://github.com/unitedstates/congress-legislators'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await saveLegislatorsToDatabase(legislators, mockFetch);

      expect(result).toEqual(['P000197']);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('INSERT OR REPLACE INTO representatives')
        })
      );
    });

    it('should save all 3 legislators (1 House + 2 Senate)', async () => {
      const legislators: Legislator[] = [
        {
          type: 'representative',
          bio: {
            last_name: 'Pelosi',
            first_name: 'Nancy',
            birthday: '1940-03-26',
            gender: 'F',
            party: 'Democratic',
            photo_url: 'https://www.congress.gov/img/member/p000197.jpg'
          },
          contact: {
            url: 'https://pelosi.house.gov',
            address: 'Washington DC 20515',
            phone: '(202) 225-4965',
            contact_form: null
          },
          social: {
            twitter: 'SpeakerPelosi',
            facebook: 'NancyPelosi',
            youtube: null
          },
          references: {
            bioguide_id: 'P000197',
            thomas_id: '00905',
            opensecrets_id: 'N00007360',
            lis_id: null,
            cspan_id: 6153,
            govtrack_id: 400314,
            votesmart_id: 26732,
            ballotpedia_id: 'Nancy Pelosi',
            washington_post_id: null,
            icpsr_id: 29547,
            wikipedia_id: 'Nancy Pelosi'
          },
          source: 'https://github.com/unitedstates/congress-legislators'
        },
        {
          type: 'senator',
          bio: {
            last_name: 'Padilla',
            first_name: 'Alex',
            birthday: '1973-03-22',
            gender: 'M',
            party: 'Democratic',
            photo_url: 'https://www.congress.gov/img/member/p000145.jpg'
          },
          contact: {
            url: 'https://www.padilla.senate.gov',
            address: 'Washington DC 20510',
            phone: '(202) 224-3553',
            contact_form: null
          },
          social: {
            twitter: 'SenAlexPadilla',
            facebook: 'AlexPadilla',
            youtube: null
          },
          references: {
            bioguide_id: 'P000145',
            thomas_id: '02230',
            opensecrets_id: 'N00044693',
            lis_id: 'S443',
            cspan_id: null,
            govtrack_id: 412679,
            votesmart_id: 69419,
            ballotpedia_id: 'Alex Padilla',
            washington_post_id: null,
            icpsr_id: 21711,
            wikipedia_id: 'Alex Padilla'
          },
          source: 'https://github.com/unitedstates/congress-legislators'
        },
        {
          type: 'senator',
          bio: {
            last_name: 'Schiff',
            first_name: 'Adam',
            birthday: '1960-06-22',
            gender: 'M',
            party: 'Democratic',
            photo_url: 'https://www.congress.gov/img/member/s001150.jpg'
          },
          contact: {
            url: 'https://www.schiff.senate.gov',
            address: 'Washington DC 20510',
            phone: '(202) 224-3553',
            contact_form: null
          },
          social: {
            twitter: 'SenAdamSchiff',
            facebook: 'AdamSchiff',
            youtube: null
          },
          references: {
            bioguide_id: 'S001150',
            thomas_id: '01635',
            opensecrets_id: 'N00006460',
            lis_id: 'S001',
            cspan_id: 45667,
            govtrack_id: 400361,
            votesmart_id: 5515,
            ballotpedia_id: 'Adam Schiff',
            washington_post_id: null,
            icpsr_id: 29748,
            wikipedia_id: 'Adam Schiff'
          },
          source: 'https://github.com/unitedstates/congress-legislators'
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await saveLegislatorsToDatabase(legislators, mockFetch);

      expect(result).toHaveLength(3);
      expect(result).toContain('P000197'); // Pelosi
      expect(result).toContain('P000145'); // Padilla
      expect(result).toContain('S001150'); // Schiff
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should extract state from address correctly', async () => {
      const legislators: Legislator[] = [
        {
          type: 'representative',
          bio: {
            last_name: 'Test',
            first_name: 'Rep',
            birthday: '1970-01-01',
            gender: 'M',
            party: 'Democratic',
            photo_url: ''
          },
          contact: {
            url: 'https://example.com',
            address: '100 Main St Washington DC 20515',
            phone: '(202) 555-0100',
            contact_form: null
          },
          social: {
            twitter: null,
            facebook: null,
            youtube: null
          },
          references: {
            bioguide_id: 'T000001',
            thomas_id: '00001',
            opensecrets_id: null,
            lis_id: null,
            cspan_id: null,
            govtrack_id: null,
            votesmart_id: null,
            ballotpedia_id: null,
            washington_post_id: null,
            icpsr_id: null,
            wikipedia_id: null
          },
          source: ''
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await saveLegislatorsToDatabase(legislators, mockFetch);

      const call = mockFetch.mock.calls[0][0];
      const body = JSON.parse(call.body);

      // State should be extracted from "Washington DC 20515" → "DC"
      expect(body.params[5]).toBe('DC');
    });
  });

  describe('linkUserToRepresentatives', () => {
    it('should link user to all their representatives', async () => {
      const userId = 'user_123';
      const bioguideIds = ['P000197', 'P000145', 'S001150'];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await linkUserToRepresentatives(userId, bioguideIds, mockFetch);

      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify each link was created
      bioguideIds.forEach((bioguideId, index) => {
        const call = mockFetch.mock.calls[index][0];
        const body = JSON.parse(call.body);

        expect(body.query).toContain('INSERT OR IGNORE INTO user_representatives');
        expect(body.params).toEqual([userId, bioguideId]);
      });
    });

    it('should use INSERT OR IGNORE to prevent duplicates', async () => {
      const userId = 'user_123';
      const bioguideIds = ['P000197'];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      await linkUserToRepresentatives(userId, bioguideIds, mockFetch);

      const call = mockFetch.mock.calls[0][0];
      const body = JSON.parse(call.body);

      expect(body.query).toContain('INSERT OR IGNORE');
    });
  });

  describe('getUserRepresentatives', () => {
    it('should retrieve all representatives for a user', async () => {
      const userId = 'user_123';

      const mockRepresentatives = [
        {
          bioguide_id: 'P000197',
          name: 'Nancy Pelosi',
          first_name: 'Nancy',
          last_name: 'Pelosi',
          party: 'Democratic',
          state: 'CA',
          district: 11,
          chamber: 'House',
          image_url: 'https://www.congress.gov/img/member/p000197.jpg',
          official_url: 'https://pelosi.house.gov'
        },
        {
          bioguide_id: 'P000145',
          name: 'Alex Padilla',
          first_name: 'Alex',
          last_name: 'Padilla',
          party: 'Democratic',
          state: 'CA',
          district: null,
          chamber: 'Senate',
          image_url: 'https://www.congress.gov/img/member/p000145.jpg',
          official_url: 'https://www.padilla.senate.gov'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockRepresentatives })
      });

      const result = await getUserRepresentatives(userId, mockFetch);

      expect(result).toEqual(mockRepresentatives);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('SELECT r.*')
        })
      );
    });
  });

  describe('getRepresentativeByBioguideId', () => {
    it('should retrieve representative by bioguide ID', async () => {
      const bioguideId = 'P000197';

      const mockRepresentative = {
        bioguide_id: 'P000197',
        name: 'Nancy Pelosi',
        first_name: 'Nancy',
        last_name: 'Pelosi',
        party: 'Democratic',
        state: 'CA',
        district: 11,
        chamber: 'House',
        image_url: 'https://www.congress.gov/img/member/p000197.jpg',
        official_url: 'https://pelosi.house.gov'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [mockRepresentative] })
      });

      const result = await getRepresentativeByBioguideId(bioguideId, mockFetch);

      expect(result).toEqual(mockRepresentative);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('WHERE bioguide_id = ?')
        })
      );
    });

    it('should return null if representative not found', async () => {
      const bioguideId = 'INVALID';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });

      const result = await getRepresentativeByBioguideId(bioguideId, mockFetch);

      expect(result).toBeNull();
    });
  });

  describe('updateUserLocation', () => {
    it('should update user state and district', async () => {
      const userId = 'user_123';
      const zipCode = '94102';
      const state = 'CA';
      const district = 11;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await updateUserLocation(userId, zipCode, state, district, mockFetch);

      const call = mockFetch.mock.calls[0][0];
      const body = JSON.parse(call.body);

      expect(body.query).toContain('UPDATE users');
      expect(body.params).toEqual([state, district, userId]);
    });

    it('should handle null district for senators', async () => {
      const userId = 'user_123';
      const zipCode = '00001';
      const state = 'DC';
      const district = null;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await updateUserLocation(userId, zipCode, state, district, mockFetch);

      const call = mockFetch.mock.calls[0][0];
      const body = JSON.parse(call.body);

      expect(body.params).toEqual([state, null, userId]);
    });
  });
});
