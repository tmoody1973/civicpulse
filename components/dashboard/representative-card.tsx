import { Mail, Phone, ExternalLink, User } from 'lucide-react';
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
          {representative.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a
                href={`tel:${representative.phone}`}
                className="hover:text-primary transition-colors"
              >
                {representative.phone}
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
        </div>

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
