import { Mail, Phone, ExternalLink, User, MapPin, Twitter, Facebook, Youtube, Instagram } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Representative {
  id: string;
  name: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  chamber: 'Senate' | 'House';
  state: string;
  district?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  committees: string[];
  // Enrichment fields
  officeAddress?: string;
  officePhone?: string;
  contactForm?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  instagramHandle?: string;
}

interface RepresentativeCardProps {
  representative: Representative;
}

const PARTY_COLORS: Record<Representative['party'], string> = {
  'Democrat': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Republican': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'Independent': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export function RepresentativeCard({ representative }: RepresentativeCardProps) {
  const location = representative.chamber === 'Senate'
    ? representative.state
    : `${representative.state}-${representative.district}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {representative.photoUrl ? (
              <img
                src={representative.photoUrl}
                alt={representative.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight mb-2">
              {representative.name}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge className={PARTY_COLORS[representative.party]}>
                {representative.party}
              </Badge>
              <Badge variant="outline">
                {representative.chamber} - {location}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="space-y-2">
          {representative.officeAddress && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                {representative.officeAddress}
              </span>
            </div>
          )}
          {representative.officePhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a
                href={`tel:${representative.officePhone}`}
                className="hover:text-primary transition-colors"
              >
                {representative.officePhone}
              </a>
            </div>
          )}
          {representative.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a
                href={`mailto:${representative.email}`}
                className="hover:text-primary transition-colors truncate"
              >
                {representative.email}
              </a>
            </div>
          )}
          {representative.websiteUrl && (
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              <a
                href={representative.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Official Website
              </a>
            </div>
          )}
          {representative.contactForm && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a
                href={representative.contactForm}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Contact Form
              </a>
            </div>
          )}
        </div>

        {/* Social Media */}
        {(representative.twitterHandle || representative.facebookUrl || representative.youtubeUrl || representative.instagramHandle) && (
          <div>
            <p className="text-sm font-medium mb-2">Follow:</p>
            <div className="flex items-center gap-3">
              {representative.twitterHandle && (
                <a
                  href={`https://twitter.com/${representative.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {representative.facebookUrl && (
                <a
                  href={representative.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {representative.youtubeUrl && (
                <a
                  href={representative.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              )}
              {representative.instagramHandle && (
                <a
                  href={`https://instagram.com/${representative.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Committees */}
        {representative.committees.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Committees:</p>
            <div className="flex flex-wrap gap-1">
              {representative.committees.slice(0, 3).map((committee, index) => (
                <Badge key={index} variant="secondary" className="text-xs font-normal">
                  {committee}
                </Badge>
              ))}
              {representative.committees.length > 3 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  +{representative.committees.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            View Voting Record
          </Button>
          <Button size="sm" className="flex-1">
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
