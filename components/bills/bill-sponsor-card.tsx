import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Globe, MapPin, Twitter, Facebook } from 'lucide-react';
import Image from 'next/image';

interface BillSponsorCardProps {
  name: string;
  party: string | null;
  state: string | null;
  imageUrl?: string | null;
  officeAddress?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  contactUrl?: string | null;
  twitterHandle?: string | null;
  facebookUrl?: string | null;
}

export function BillSponsorCard({
  name,
  party,
  state,
  imageUrl,
  officeAddress,
  phone,
  websiteUrl,
  contactUrl,
  twitterHandle,
  facebookUrl,
}: BillSponsorCardProps) {
  const partyColor = {
    R: 'bg-red-100 text-red-800 border-red-200',
    D: 'bg-blue-100 text-blue-800 border-blue-200',
    I: 'bg-purple-100 text-purple-800 border-purple-200',
  }[party || ''] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Bill Sponsor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sponsor Info */}
        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="flex-shrink-0">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                width={80}
                height={80}
                className="rounded-lg border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg border-2 border-border bg-muted flex items-center justify-center">
                <span className="text-2xl font-bold text-muted-foreground">
                  {name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Name and Party */}
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={partyColor}>
                {party === 'R' ? 'Republican' : party === 'D' ? 'Democrat' : party === 'I' ? 'Independent' : party}
              </Badge>
              {state && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {state}
                </div>
              )}
            </div>
            {officeAddress && (
              <p className="text-xs text-muted-foreground mt-2">{officeAddress}</p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Contact Information</p>
          <div className="grid grid-cols-1 gap-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="w-4 h-4" />
                {phone}
              </a>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Globe className="w-4 h-4" />
                Official Website
              </a>
            )}
            {contactUrl && (
              <a
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="w-4 h-4" />
                Contact Form
              </a>
            )}
          </div>
        </div>

        {/* Social Media */}
        {(twitterHandle || facebookUrl) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Social Media</p>
            <div className="flex items-center gap-2">
              {twitterHandle && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => window.open(`https://twitter.com/${twitterHandle}`, '_blank')}
                >
                  <Twitter className="w-4 h-4 mr-1" />
                  Twitter
                </Button>
              )}
              {facebookUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => window.open(facebookUrl, '_blank')}
                >
                  <Facebook className="w-4 h-4 mr-1" />
                  Facebook
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
