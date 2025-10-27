'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Globe, MapPin, Building2, Twitter, Facebook, Youtube } from 'lucide-react';
import Image from 'next/image';

interface Representative {
  bioguide_id: string;
  name: string;
  first_name: string;
  last_name: string;
  party: string;
  type: string;
  chamber: string;
  photo?: string;
  phone?: string;
  website?: string;
  address?: string;
  twitter?: string;
  facebook?: string;
  youtube?: string;
  seniority?: number;
}

interface RepresentativeCardsProps {
  representatives: Representative[];
  location?: {
    city: string;
    state: string;
    district: string;
  };
  onContinue?: () => void;
}

export function RepresentativeCards({ representatives, location, onContinue }: RepresentativeCardsProps) {
  // Sort: House rep first, then Senators
  const sorted = [...representatives].sort((a, b) => {
    if (a.type === 'representative' && b.type !== 'representative') return -1;
    if (a.type !== 'representative' && b.type === 'representative') return 1;
    return 0;
  });

  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'bg-blue-500';
    if (party.toLowerCase().includes('republican')) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getChamberIcon = (chamber: string) => {
    return chamber.toLowerCase() === 'house' ? Building2 : MapPin;
  };

  return (
    <div className="space-y-6">
      {/* Location Header */}
      {location && (
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Your Representatives</h2>
          <p className="text-muted-foreground">
            <MapPin className="inline h-4 w-4 mr-1" />
            {location.city}, {location.state} - District {location.district}
          </p>
        </div>
      )}

      {/* Representative Cards */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {sorted.map((rep) => {
          const ChamberIcon = getChamberIcon(rep.chamber);

          return (
            <Card key={rep.bioguide_id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {rep.photo ? (
                      <Image
                        src={rep.photo}
                        alt={rep.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                        {rep.first_name[0]}{rep.last_name[0]}
                      </div>
                    )}
                  </div>

                  {/* Name & Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{rep.name}</h3>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {/* Party Badge */}
                      <Badge className={getPartyColor(rep.party)}>
                        {rep.party}
                      </Badge>

                      {/* Chamber Badge */}
                      <Badge variant="outline" className="flex items-center gap-1">
                        <ChamberIcon className="h-3 w-3" />
                        {rep.chamber}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Contact Info */}
                {rep.phone && (
                  <a
                    href={`tel:${rep.phone}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{rep.phone}</span>
                  </a>
                )}

                {rep.website && (
                  <a
                    href={rep.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors truncate"
                  >
                    <Globe className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Visit Website</span>
                  </a>
                )}

                {/* Social Media */}
                <div className="flex gap-2 pt-2 border-t">
                  {rep.twitter && (
                    <a
                      href={`https://twitter.com/${rep.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-blue-400 transition-colors"
                      title="Twitter"
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  )}
                  {rep.facebook && (
                    <a
                      href={`https://facebook.com/${rep.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-blue-600 transition-colors"
                      title="Facebook"
                    >
                      <Facebook className="h-4 w-4" />
                    </a>
                  )}
                  {rep.youtube && (
                    <a
                      href={`https://youtube.com/${rep.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-red-600 transition-colors"
                      title="YouTube"
                    >
                      <Youtube className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Seniority */}
                {rep.seniority && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Seniority: {rep.seniority} {rep.seniority === 1 ? 'term' : 'terms'}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue Button */}
      {onContinue && (
        <div className="flex justify-center pt-6">
          <Button size="lg" onClick={onContinue} className="min-w-[200px]">
            Continue to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
