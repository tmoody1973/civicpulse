/**
 * Geocodio API Tests
 *
 * Tests for ZIP code lookup and congressional district resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  lookupCongressionalDistrict,
  type GeocodioResponse,
  type CongressionalDistrictResult
} from '../geocodio';

// Mock fetch globally
global.fetch = vi.fn();

describe('Geocodio API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('lookupCongressionalDistrict', () => {
    it('should successfully fetch congressional district for valid ZIP code', async () => {
      const mockResponse: GeocodioResponse = {
        input: {
          address_components: {
            zip: '94102',
            country: 'US'
          },
          formatted_address: 'San Francisco, CA 94102'
        },
        results: [
          {
            address_components: {
              city: 'San Francisco',
              state: 'CA',
              zip: '94102'
            },
            formatted_address: '94102, San Francisco, CA',
            location: {
              lat: 37.7793,
              lng: -122.4193
            },
            fields: {
              congressional_districts: [
                {
                  name: 'Congressional District 11',
                  district_number: 11,
                  ocd_id: 'ocd-division/country:us/state:ca/cd:11',
                  congress_number: '119th',
                  congress_years: '2025-2027',
                  proportion: 1.0,
                  current_legislators: [
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
                        address: '90 7th Street Suite 2-800 San Francisco CA 94103',
                        phone: '(415) 556-4862',
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
                      source: 'Legislator data is originally collected and aggregated by https://github.com/unitedstates/congress-legislators'
                    }
                  ]
                }
              ]
            }
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await lookupCongressionalDistrict('94102');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.geocod.io/v1.7/geocode'),
        expect.any(Object)
      );
      expect(result).toBeDefined();
      expect(result.state).toBe('CA');
      expect(result.district).toBe(11);
      expect(result.legislators).toHaveLength(1);
      expect(result.legislators[0].bio.first_name).toBe('Nancy');
      expect(result.legislators[0].bio.last_name).toBe('Pelosi');
    });

    it('should handle ZIP codes with multiple congressional districts', async () => {
      const mockResponse: GeocodioResponse = {
        input: {
          address_components: {
            zip: '10001',
            country: 'US'
          },
          formatted_address: 'New York, NY 10001'
        },
        results: [
          {
            address_components: {
              city: 'New York',
              state: 'NY',
              zip: '10001'
            },
            formatted_address: '10001, New York, NY',
            location: {
              lat: 40.7506,
              lng: -73.9971
            },
            fields: {
              congressional_districts: [
                {
                  name: 'Congressional District 12',
                  district_number: 12,
                  ocd_id: 'ocd-division/country:us/state:ny/cd:12',
                  congress_number: '119th',
                  congress_years: '2025-2027',
                  proportion: 0.6,
                  current_legislators: []
                },
                {
                  name: 'Congressional District 10',
                  district_number: 10,
                  ocd_id: 'ocd-division/country:us/state:ny/cd:10',
                  congress_number: '119th',
                  congress_years: '2025-2027',
                  proportion: 0.4,
                  current_legislators: []
                }
              ]
            }
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await lookupCongressionalDistrict('10001');

      // Should return the district with highest proportion
      expect(result.district).toBe(12);
    });

    it('should throw error for invalid ZIP code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity'
      });

      await expect(lookupCongressionalDistrict('00000')).rejects.toThrow(
        'Geocodio API error: 422 Unprocessable Entity'
      );
    });

    it('should throw error when API key is missing', async () => {
      const originalEnv = process.env.GEOCODIO_API_KEY;
      delete process.env.GEOCODIO_API_KEY;

      await expect(lookupCongressionalDistrict('94102')).rejects.toThrow(
        'GEOCODIO_API_KEY is not set'
      );

      process.env.GEOCODIO_API_KEY = originalEnv;
    });

    it('should handle response with no congressional districts', async () => {
      const mockResponse: GeocodioResponse = {
        input: {
          address_components: {
            zip: '96799', // APO/FPO address
            country: 'US'
          },
          formatted_address: '96799'
        },
        results: [
          {
            address_components: {
              city: null,
              state: null,
              zip: '96799'
            },
            formatted_address: '96799',
            location: {
              lat: 0,
              lng: 0
            },
            fields: {
              congressional_districts: []
            }
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(lookupCongressionalDistrict('96799')).rejects.toThrow(
        'No congressional district found for this ZIP code'
      );
    });

    it('should handle Senators (no district number)', async () => {
      const mockResponse: GeocodioResponse = {
        input: {
          address_components: {
            zip: '90210',
            country: 'US'
          },
          formatted_address: 'Beverly Hills, CA 90210'
        },
        results: [
          {
            address_components: {
              city: 'Beverly Hills',
              state: 'CA',
              zip: '90210'
            },
            formatted_address: '90210, Beverly Hills, CA',
            location: {
              lat: 34.0901,
              lng: -118.4065
            },
            fields: {
              congressional_districts: [
                {
                  name: 'Congressional District 30',
                  district_number: 30,
                  ocd_id: 'ocd-division/country:us/state:ca/cd:30',
                  congress_number: '119th',
                  congress_years: '2025-2027',
                  proportion: 1.0,
                  current_legislators: [
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
                        address: '331 Hart Senate Office Building Washington DC 20510',
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
                      source: 'Legislator data is originally collected and aggregated by https://github.com/unitedstates/congress-legislators'
                    }
                  ]
                }
              ]
            }
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await lookupCongressionalDistrict('90210');

      expect(result.legislators).toHaveLength(1);
      expect(result.legislators[0].type).toBe('senator');
      expect(result.legislators[0].bio.first_name).toBe('Adam');
    });

    it('should include all 3 legislators (1 House + 2 Senate)', async () => {
      const mockResponse: GeocodioResponse = {
        input: {
          address_components: {
            zip: '94102',
            country: 'US'
          },
          formatted_address: 'San Francisco, CA 94102'
        },
        results: [
          {
            address_components: {
              city: 'San Francisco',
              state: 'CA',
              zip: '94102'
            },
            formatted_address: '94102, San Francisco, CA',
            location: {
              lat: 37.7793,
              lng: -122.4193
            },
            fields: {
              congressional_districts: [
                {
                  name: 'Congressional District 11',
                  district_number: 11,
                  ocd_id: 'ocd-division/country:us/state:ca/cd:11',
                  congress_number: '119th',
                  congress_years: '2025-2027',
                  proportion: 1.0,
                  current_legislators: [
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
                        address: '90 7th Street Suite 2-800 San Francisco CA 94103',
                        phone: '(415) 556-4862',
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
                      source: 'Legislator data is originally collected and aggregated by https://github.com/unitedstates/congress-legislators'
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
                        address: '112 Hart Senate Office Building Washington DC 20510',
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
                      source: 'Legislator data is originally collected and aggregated by https://github.com/unitedstates/congress-legislators'
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
                        address: '331 Hart Senate Office Building Washington DC 20510',
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
                      source: 'Legislator data is originally collected and aggregated by https://github.com/unitedstates/congress-legislators'
                    }
                  ]
                }
              ]
            }
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await lookupCongressionalDistrict('94102');

      expect(result.legislators).toHaveLength(3);

      const representative = result.legislators.find(l => l.type === 'representative');
      const senators = result.legislators.filter(l => l.type === 'senator');

      expect(representative).toBeDefined();
      expect(senators).toHaveLength(2);
      expect(representative?.bio.last_name).toBe('Pelosi');
      expect(senators.map(s => s.bio.last_name)).toContain('Padilla');
      expect(senators.map(s => s.bio.last_name)).toContain('Schiff');
    });
  });
});
