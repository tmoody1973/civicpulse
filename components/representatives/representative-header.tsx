/**
 * Representative Header Component
 *
 * Displays representative profile with photo, name, party, contact info
 */

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Phone,
  Globe,
  Mail,
  Twitter,
  Facebook,
  Youtube,
  Instagram,
  ExternalLink
} from 'lucide-react';

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  chamber: string;
  state: string;
  district?: string;
  imageUrl?: string;
  officeAddress?: string;
  phone?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  instagramHandle?: string;
  contactUrl?: string;
}

interface RepresentativeHeaderProps {
  representative: Representative;
}

export function RepresentativeHeader({ representative }: RepresentativeHeaderProps) {
  const {
    name,
    party,
    chamber,
    state,
    district,
    imageUrl,
    officeAddress,
    phone,
    websiteUrl,
    twitterHandle,
    facebookUrl,
    youtubeUrl,
    instagramHandle,
    contactUrl
  } = representative;

  // Party color
  const partyColor =
    party === 'Democratic' || party === 'Democrat'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : party === 'Republican'
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';

  // Chamber badge
  const chamberText = chamber === 'house' ? 'U.S. House' : 'U.S. Senate';
  const location = district
    ? `${state}-${district}`
    : state;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="md:flex">
          {/* Profile Image */}
          <div className="md:w-64 md:flex-shrink-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-8">
            {imageUrl ? (
              <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <Image
                  src={imageUrl}
                  alt={name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="w-48 h-48 rounded-full bg-gray-200 flex items-center justify-center text-6xl font-bold text-gray-400">
                {name.split(' ').map(n => n[0]).join('')}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 p-6">
            <div className="space-y-4">
              {/* Name and Party */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{name}</h1>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={partyColor}>
                    {party}
                  </Badge>
                  <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-800">
                    {chamberText}
                  </Badge>
                  <Badge variant="outline" className="border-green-200 bg-green-50 text-green-800">
                    <MapPin className="w-3 h-3 mr-1" />
                    {location}
                  </Badge>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {officeAddress && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{officeAddress}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
                      {phone}
                    </a>
                  </div>
                )}
                {websiteUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Official Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {contactUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={contactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Contact Form
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {(twitterHandle || facebookUrl || youtubeUrl || instagramHandle) && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">Follow on social media</p>
                  <div className="flex flex-wrap gap-2">
                    {twitterHandle && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a
                          href={`https://twitter.com/${twitterHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Twitter className="w-4 h-4" />
                          @{twitterHandle}
                        </a>
                      </Button>
                    )}
                    {facebookUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a
                          href={facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Facebook className="w-4 h-4" />
                          Facebook
                        </a>
                      </Button>
                    )}
                    {youtubeUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a
                          href={youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Youtube className="w-4 h-4" />
                          YouTube
                        </a>
                      </Button>
                    )}
                    {instagramHandle && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a
                          href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Instagram className="w-4 h-4" />
                          {instagramHandle}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
