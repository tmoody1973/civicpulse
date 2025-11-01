/**
 * Loading Skeleton for Representative Detail Page
 *
 * Displays while data is being fetched from Congress.gov API
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation breadcrumb skeleton */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-20" />
            <span className="text-gray-400">/</span>
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Representative profile header skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Profile image */}
                <Skeleton className="w-32 h-32 rounded-full flex-shrink-0" />

                {/* Profile info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-5 w-48" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick statistics skeleton */}
          <div className="space-y-4">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="border-2">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-9 w-16" />
                        {i === 2 && <Skeleton className="h-3 w-20" />}
                      </div>
                      <Skeleton className="h-12 w-12 rounded-lg" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Legislation tabs skeleton */}
          <div className="space-y-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>

            {/* Tabs */}
            <div className="space-y-6">
              <div className="flex gap-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
              </div>

              {/* Bills list skeleton */}
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border-l-4">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-5 w-24" />
                              <Skeleton className="h-6 w-32" />
                            </div>
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-3/4" />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-4 w-full" />
                        </div>

                        <Skeleton className="h-9 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Loading message */}
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Loading representative data from Congress.gov...</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This may take up to 30 seconds for members with extensive legislative history
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
