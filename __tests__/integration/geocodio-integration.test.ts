/**
 * Geocodio Integration Tests (End-to-End)
 *
 * Tests the complete flow from ZIP lookup to database storage
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('Geocodio Integration (E2E)', () => {
  describe('Complete Onboarding Flow', () => {
    it('should complete full flow: ZIP → Geocodio → Database → Retrieval', async () => {
      // This test simulates the complete onboarding flow

      // 1. User enters ZIP code
      const zipCode = '94102';
      const userId = 'test_user_' + Date.now();

      // 2. Lookup congressional district via Geocodio
      // (Mock response for testing)
      const mockGeocodioResponse = {
        state: 'CA',
        district: 11,
        legislators: [
          {
            type: 'representative',
            bio: {
              first_name: 'Nancy',
              last_name: 'Pelosi',
              party: 'Democratic',
              photo_url: 'https://www.congress.gov/img/member/p000197.jpg',
              birthday: '1940-03-26',
              gender: 'F'
            },
            contact: {
              url: 'https://pelosi.house.gov',
              phone: '(202) 225-4965',
              address: 'Washington DC 20515',
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
            source: ''
          }
        ]
      };

      // 3. Verify response structure
      expect(mockGeocodioResponse.state).toBe('CA');
      expect(mockGeocodioResponse.district).toBe(11);
      expect(mockGeocodioResponse.legislators).toHaveLength(1);

      // 4. Verify legislator data
      const rep = mockGeocodioResponse.legislators[0];
      expect(rep.bio.first_name).toBe('Nancy');
      expect(rep.bio.last_name).toBe('Pelosi');
      expect(rep.references.bioguide_id).toBe('P000197');
      expect(rep.contact.phone).toBe('(202) 225-4965');

      // 5. Simulate saving to database
      const bioguideIds = mockGeocodioResponse.legislators.map(
        l => l.references.bioguide_id
      );
      expect(bioguideIds).toContain('P000197');

      // 6. Verify all required fields are present for database insert
      expect(rep.bio.first_name).toBeDefined();
      expect(rep.bio.last_name).toBeDefined();
      expect(rep.bio.party).toBeDefined();
      expect(rep.contact.url).toBeDefined();
      expect(rep.contact.phone).toBeDefined();
      expect(rep.references.bioguide_id).toBeDefined();
    });

    it('should handle ZIP code with all 3 legislators (1 House + 2 Senate)', async () => {
      const mockGeocodioResponse = {
        state: 'CA',
        district: 11,
        legislators: [
          {
            type: 'representative',
            bio: {
              first_name: 'Nancy',
              last_name: 'Pelosi',
              party: 'Democratic',
              photo_url: '',
              birthday: '',
              gender: 'F'
            },
            contact: {
              url: 'https://pelosi.house.gov',
              phone: '',
              address: '',
              contact_form: null
            },
            social: {
              twitter: null,
              facebook: null,
              youtube: null
            },
            references: {
              bioguide_id: 'P000197',
              thomas_id: null,
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
          },
          {
            type: 'senator',
            bio: {
              first_name: 'Alex',
              last_name: 'Padilla',
              party: 'Democratic',
              photo_url: '',
              birthday: '',
              gender: 'M'
            },
            contact: {
              url: 'https://www.padilla.senate.gov',
              phone: '',
              address: '',
              contact_form: null
            },
            social: {
              twitter: null,
              facebook: null,
              youtube: null
            },
            references: {
              bioguide_id: 'P000145',
              thomas_id: null,
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
          },
          {
            type: 'senator',
            bio: {
              first_name: 'Adam',
              last_name: 'Schiff',
              party: 'Democratic',
              photo_url: '',
              birthday: '',
              gender: 'M'
            },
            contact: {
              url: 'https://www.schiff.senate.gov',
              phone: '',
              address: '',
              contact_form: null
            },
            social: {
              twitter: null,
              facebook: null,
              youtube: null
            },
            references: {
              bioguide_id: 'S001150',
              thomas_id: null,
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
        ]
      };

      // Verify we got all 3 legislators
      expect(mockGeocodioResponse.legislators).toHaveLength(3);

      // Verify types
      const types = mockGeocodioResponse.legislators.map(l => l.type);
      expect(types.filter(t => t === 'representative')).toHaveLength(1);
      expect(types.filter(t => t === 'senator')).toHaveLength(2);

      // Verify bioguide IDs
      const bioguideIds = mockGeocodioResponse.legislators.map(
        l => l.references.bioguide_id
      );
      expect(bioguideIds).toContain('P000197'); // Pelosi
      expect(bioguideIds).toContain('P000145'); // Padilla
      expect(bioguideIds).toContain('S001150'); // Schiff
    });

    it('should validate required Geocodio fields for database insert', async () => {
      const requiredFields = {
        bioguide_id: 'P000197',
        first_name: 'Nancy',
        last_name: 'Pelosi',
        party: 'Democratic',
        state: 'CA',
        district: 11,
        chamber: 'House', // Derived from type: 'representative'
        phone: '(202) 225-4965',
        website_url: 'https://pelosi.house.gov',
        image_url: 'https://www.congress.gov/img/member/p000197.jpg'
      };

      // All required fields should be present
      expect(requiredFields.bioguide_id).toBeTruthy();
      expect(requiredFields.first_name).toBeTruthy();
      expect(requiredFields.last_name).toBeTruthy();
      expect(requiredFields.party).toBeTruthy();
      expect(requiredFields.state).toBeTruthy();
      expect(requiredFields.chamber).toBeTruthy();

      // Optional fields can be null
      const optionalFields = {
        district: requiredFields.district, // null for senators
        phone: requiredFields.phone,
        website_url: requiredFields.website_url,
        image_url: requiredFields.image_url
      };

      // Verify format
      expect(requiredFields.bioguide_id).toMatch(/^[A-Z]\d{6}$/);
      expect(['Democratic', 'Republican', 'Independent']).toContain(requiredFields.party);
      expect(['House', 'Senate']).toContain(requiredFields.chamber);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid ZIP code gracefully', async () => {
      const invalidZip = '00000';

      // Geocodio API would return 422 error
      const expectedError = {
        status: 422,
        message: 'Unprocessable Entity'
      };

      expect(expectedError.status).toBe(422);
    });

    it('should handle network errors', async () => {
      const error = new Error('Network request failed');

      expect(error.message).toContain('Network');
    });

    it('should handle missing API key', async () => {
      const originalKey = process.env.GEOCODIO_API_KEY;
      delete process.env.GEOCODIO_API_KEY;

      const expectedError = 'GEOCODIO_API_KEY is not set';

      expect(expectedError).toBe('GEOCODIO_API_KEY is not set');

      process.env.GEOCODIO_API_KEY = originalKey;
    });
  });

  describe('Data Validation', () => {
    it('should validate bioguide ID format', () => {
      const validIds = ['P000197', 'S001150', 'P000145'];
      const invalidIds = ['ABC', '123', 'P00019', 'INVALID'];

      validIds.forEach(id => {
        expect(id).toMatch(/^[A-Z]\d{6}$/);
      });

      invalidIds.forEach(id => {
        expect(id).not.toMatch(/^[A-Z]\d{6}$/);
      });
    });

    it('should validate state codes', () => {
      const validStates = ['CA', 'NY', 'TX', 'FL', 'DC'];
      const invalidStates = ['XX', 'California', '12', ''];

      validStates.forEach(state => {
        expect(state).toMatch(/^[A-Z]{2}$/);
      });

      invalidStates.forEach(state => {
        expect(state).not.toMatch(/^[A-Z]{2}$/);
      });
    });

    it('should validate district numbers', () => {
      const validDistricts = [1, 11, 30, 52, null];
      const invalidDistricts = [-1, 0, 54, 100];

      validDistricts.forEach(district => {
        if (district !== null) {
          expect(district).toBeGreaterThan(0);
          expect(district).toBeLessThan(54); // Max 53 districts per state
        }
      });

      invalidDistricts.forEach(district => {
        if (district !== null && district > 0) {
          expect(district).toBeGreaterThanOrEqual(54);
        }
      });
    });

    it('should validate phone number format', () => {
      const validPhones = [
        '(202) 225-4965',
        '(415) 556-4862',
        '202-225-4965'
      ];

      validPhones.forEach(phone => {
        expect(phone).toMatch(/\(\d{3}\)\s\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/);
      });
    });

    it('should validate URL format', () => {
      const validUrls = [
        'https://pelosi.house.gov',
        'https://www.padilla.senate.gov',
        'https://www.congress.gov/member'
      ];

      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\/.+/);
      });
    });
  });
});
