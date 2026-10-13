/**
 * RiskShield AI — Safe Development Database Seed Script
 * Populates initial verified Brand Workspaces and official DNS-attested assets for local development.
 */

export const INITIAL_BRAND_SEEDS = [
  {
    id: 'RB-01',
    name: 'Acme Financial',
    slug: 'acme-financial',
    category: 'Banking & FinTech',
    website: 'https://acmefinancial.com',
    status: 'FEATURED_PARTNER',
    officialAssets: [
      { type: 'DOMAIN', value: 'acmefinancial.com', status: 'VERIFIED' },
      { type: 'SUBDOMAIN', value: 'secure.acmefinancial.com', status: 'VERIFIED' },
      { type: 'SOCIAL_HANDLE', value: '@acmefinancial', status: 'VERIFIED' }
    ]
  },
  {
    id: 'RB-02',
    name: 'NovaPay Global',
    slug: 'novapay-global',
    category: 'Digital Payments',
    website: 'https://novapay.io',
    status: 'VERIFIED',
    officialAssets: [
      { type: 'DOMAIN', value: 'novapay.io', status: 'VERIFIED' },
      { type: 'SOCIAL_HANDLE', value: '@novapay_official', status: 'VERIFIED' }
    ]
  }
];
