/**
 * Legislation Tabs Component
 *
 * Displays tabbed interface for sponsored and co-sponsored bills with filtering, sorting, and pagination
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ArrowRight, Tag, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Bill {
  billId: string;
  congress: number;
  billNumber: string;
  billType: string;
  title: string;
  introducedDate: string;
  latestActionDate: string;
  latestActionText: string;
  status: string;
  policyArea?: string;
}

interface LegislationTabsProps {
  sponsoredBills: Bill[];
  cosponsoredBills: Bill[];
}

// Bill List Component (reusable for both tabs)
function BillList({ bills, title }: { bills: Bill[]; title: string }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Get unique statuses for filter
  const statuses = [...new Set(bills.map(b => b.status))].filter(Boolean);

  // Filter bills
  const filteredBills = bills.filter(bill => {
    if (statusFilter === 'all') return true;
    return bill.status === statusFilter;
  });

  // Sort bills
  const sortedBills = [...filteredBills].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime();
      case 'oldest':
        return new Date(a.introducedDate).getTime() - new Date(b.introducedDate).getTime();
      case 'recent-activity':
        return new Date(b.latestActionDate).getTime() - new Date(a.latestActionDate).getTime();
      default:
        return 0;
    }
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBills = sortedBills.slice(startIndex, endIndex);

  // Reset to page 1 when filters or sorting changes
  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Became Law':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Passed House':
      case 'Passed Senate':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Introduced':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Get bill type display name
  const getBillTypeDisplay = (type: string | undefined) => {
    if (!type) return '';
    const types: Record<string, string> = {
      'hr': 'H.R.',
      's': 'S.',
      'hjres': 'H.J.Res.',
      'sjres': 'S.J.Res.',
      'hconres': 'H.Con.Res.',
      'sconres': 'S.Con.Res.',
      'hres': 'H.Res.',
      'sres': 'S.Res.'
    };
    return types[type.toLowerCase()] || type.toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 mt-1">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedBills.length)} of {sortedBills.length} bills
            {sortedBills.length !== bills.length && ` (filtered from ${bills.length} total)`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="recent-activity">Recent Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bills list */}
      {sortedBills.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No bills found matching the current filters.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => handleFilterChange('all')}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedBills.map((bill) => (
            <Card
              key={bill.billId}
              className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
            >
              <CardContent className="p-6">
                <div className="space-y-3">
                  {/* Bill header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {getBillTypeDisplay(bill.billType)} {bill.billNumber}
                        </span>
                        <Badge variant="outline" className={getStatusColor(bill.status)}>
                          {bill.status}
                        </Badge>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {bill.title}
                      </h4>
                    </div>
                  </div>

                  {/* Bill metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Introduced {formatDate(bill.introducedDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Last action {formatDate(bill.latestActionDate)}</span>
                    </div>
                    {bill.policyArea && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        <span>{bill.policyArea}</span>
                      </div>
                    )}
                  </div>

                  {/* Latest action */}
                  {bill.latestActionText && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Latest Action
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {bill.latestActionText}
                      </p>
                    </div>
                  )}

                  {/* View details button */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="group"
                    >
                      <Link href={`/bills/${bill.billId}`}>
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {sortedBills.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {/* Page numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Show first page, last page, current page, and pages around current
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="min-w-[40px]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LegislationTabs({ sponsoredBills, cosponsoredBills }: LegislationTabsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Legislation</h2>
        <p className="text-gray-600 mt-1">
          View bills sponsored and co-sponsored by this representative
        </p>
      </div>

      <Tabs defaultValue="sponsored" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="sponsored">
            Sponsored ({sponsoredBills.length})
          </TabsTrigger>
          <TabsTrigger value="cosponsored">
            Co-Sponsored ({cosponsoredBills.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sponsored" className="mt-6">
          <BillList
            bills={sponsoredBills}
            title="Bills Sponsored"
          />
        </TabsContent>

        <TabsContent value="cosponsored" className="mt-6">
          {cosponsoredBills.length > 0 ? (
            <BillList
              bills={cosponsoredBills}
              title="Bills Co-Sponsored"
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No co-sponsored bills found.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
