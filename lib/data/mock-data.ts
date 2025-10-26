import type { Bill } from '@/components/dashboard/bill-card';
import type { Representative } from '@/components/dashboard/representative-card';
import type { NewsArticle } from '@/components/dashboard/news-feed-card';

// Mock Bills
export const MOCK_BILLS: Bill[] = [
  {
    id: '1',
    number: 'H.R. 1234',
    title: 'Healthcare Access and Affordability Act',
    summary: 'This bill expands access to affordable healthcare coverage through state-based exchanges and increases subsidies for low-income individuals and families.',
    status: 'passed-house',
    issueCategories: ['Healthcare', 'Finance'],
    impactScore: 85,
    lastAction: 'Passed House, referred to Senate',
    lastActionDate: '2025-10-25',
  },
  {
    id: '2',
    number: 'S. 567',
    title: 'Clean Energy Infrastructure Investment Act',
    summary: 'Provides $50 billion in federal funding for renewable energy infrastructure projects including solar, wind, and battery storage facilities across the nation.',
    status: 'committee',
    issueCategories: ['Energy & Environment', 'Infrastructure'],
    impactScore: 72,
    lastAction: 'Under review in Senate Committee on Energy',
    lastActionDate: '2025-10-24',
  },
  {
    id: '3',
    number: 'H.R. 789',
    title: 'Student Loan Relief and Education Funding Act',
    summary: 'Cancels up to $10,000 in federal student loan debt for borrowers earning under $125,000 annually and increases Pell Grant funding by 20%.',
    status: 'introduced',
    issueCategories: ['Education', 'Finance'],
    impactScore: 68,
    lastAction: 'Introduced in House',
    lastActionDate: '2025-10-23',
  },
  {
    id: '4',
    number: 'S. 234',
    title: 'Cybersecurity and Data Privacy Protection Act',
    summary: 'Establishes comprehensive data privacy standards for tech companies and creates federal enforcement mechanisms for cybersecurity breaches.',
    status: 'passed-senate',
    issueCategories: ['Technology', 'Privacy'],
    impactScore: 56,
    lastAction: 'Passed Senate, sent to House',
    lastActionDate: '2025-10-26',
  },
];

// Mock Representatives
export const MOCK_REPRESENTATIVES: Representative[] = [
  {
    id: '1',
    name: 'Senator Jane Smith',
    party: 'Democrat',
    chamber: 'Senate',
    state: 'CA',
    email: 'senator.smith@senate.gov',
    phone: '(202) 224-3553',
    websiteUrl: 'https://www.senate.gov/smith',
    committees: ['Finance', 'Healthcare', 'Energy & Natural Resources'],
  },
  {
    id: '2',
    name: 'Senator John Doe',
    party: 'Republican',
    chamber: 'Senate',
    state: 'CA',
    email: 'senator.doe@senate.gov',
    phone: '(202) 224-3554',
    websiteUrl: 'https://www.senate.gov/doe',
    committees: ['Armed Services', 'Judiciary', 'Intelligence'],
  },
  {
    id: '3',
    name: 'Rep. Maria Garcia',
    party: 'Democrat',
    chamber: 'House',
    state: 'CA',
    district: '12',
    email: 'rep.garcia@house.gov',
    phone: '(202) 225-2305',
    websiteUrl: 'https://www.house.gov/garcia',
    committees: ['Ways and Means', 'Budget', 'Small Business'],
  },
];

// Mock News Articles (The Hill format)
export const MOCK_NEWS_ARTICLES: NewsArticle[] = [
  {
    title: 'Senate passes bipartisan infrastructure bill with overwhelming support',
    link: 'https://thehill.com/policy/finance/12345',
    pubDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    description: 'The Senate voted 69-30 to pass a $1.2 trillion infrastructure package, marking a rare moment of bipartisan cooperation.',
    source: 'Senate',
  },
  {
    title: 'House committee advances healthcare reform legislation',
    link: 'https://thehill.com/policy/healthcare/12346',
    pubDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    description: 'The House Ways and Means Committee approved sweeping healthcare reforms aimed at lowering prescription drug costs.',
    source: 'House',
  },
  {
    title: 'New climate package faces uphill battle in divided Congress',
    link: 'https://thehill.com/policy/energy-environment/12347',
    pubDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    description: 'Democrats push for ambitious climate legislation as Republicans signal opposition to new spending measures.',
    source: 'Energy & Environment',
  },
  {
    title: 'Tech companies face increased scrutiny over data privacy practices',
    link: 'https://thehill.com/policy/technology/12348',
    pubDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    description: 'Senate hearing reveals gaps in current data protection laws as lawmakers consider new regulations.',
    source: 'Technology',
  },
  {
    title: 'Defense authorization bill includes pay raise for military personnel',
    link: 'https://thehill.com/policy/defense/12349',
    pubDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    description: 'The annual defense bill includes a 5.2% pay increase for service members and $886 billion in total spending.',
    source: 'Defense',
  },
];
