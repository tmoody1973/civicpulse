import type { Bill } from '@/components/dashboard/bill-card';
import type { BillFilterOptions } from '@/components/dashboard/bill-filters';

/**
 * Filter bills based on search query and filter options
 */
export function filterBills(bills: Bill[], filters: BillFilterOptions): Bill[] {
  return bills.filter((bill) => {
    // Search filter (title, number, summary, sponsor name)
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      const matchesSearch =
        bill.title.toLowerCase().includes(query) ||
        bill.number.toLowerCase().includes(query) ||
        bill.summary.toLowerCase().includes(query) ||
        (bill.sponsorName && bill.sponsorName.toLowerCase().includes(query));

      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status.length > 0) {
      if (!filters.status.includes(bill.status)) return false;
    }

    // Impact level filter
    if (filters.impactLevel !== 'all') {
      const score = bill.impactScore;
      switch (filters.impactLevel) {
        case 'high':
          if (score < 70) return false;
          break;
        case 'medium':
          if (score < 40 || score >= 70) return false;
          break;
        case 'low':
          if (score >= 40) return false;
          break;
      }
    }

    // Category filter
    if (filters.categories.length > 0) {
      const hasMatchingCategory = filters.categories.some((category) =>
        bill.issueCategories.includes(category)
      );
      if (!hasMatchingCategory) return false;
    }

    // Party filter (sponsor party)
    if (filters.party.length > 0 && bill.sponsorParty) {
      if (!filters.party.includes(bill.sponsorParty)) return false;
    }

    return true;
  });
}

/**
 * Get all unique categories from a list of bills
 */
export function getUniqueBillCategories(bills: Bill[]): string[] {
  const categoriesSet = new Set<string>();

  bills.forEach((bill) => {
    bill.issueCategories.forEach((category) => {
      categoriesSet.add(category);
    });
  });

  return Array.from(categoriesSet).sort();
}
