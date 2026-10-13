import { z } from 'zod';

export const brandAssetTypeEnum = z.enum([
  'DOMAIN',
  'SUBDOMAIN',
  'SOCIAL_HANDLE',
  'TRADEMARK',
  'MERCHANT',
  'MOBILE_APP',
  'CONTACT_CHANNEL'
]);

export const addBrandAssetSchema = z.object({
  brandId: z.string().uuid('Valid Brand Workspace UUID is required'),
  type: brandAssetTypeEnum,
  platform: z.string().trim().max(100).optional(),
  value: z.string().trim().min(1, 'Asset identifier or value is required').max(2000)
});

export const updateBrandProfileSchema = z.object({
  brandId: z.string().uuid('Valid Brand Workspace UUID is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  website: z.string().trim().max(500).optional(),
  category: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Accent color must be a valid 6-character hex code').optional(),
  businessEmail: z.string().trim().email().optional().nullable(),
  supportEmail: z.string().trim().email().optional().nullable(),
  securityContactEmail: z.string().trim().email().optional().nullable(),
  officialPhone: z.string().trim().max(50).optional().nullable()
});

export const verifyAssetDnsSchema = z.object({
  brandId: z.string().uuid('Valid Brand Workspace UUID is required'),
  assetId: z.string().uuid('Valid Brand Asset UUID is required')
});

export type AddBrandAssetInput = z.infer<typeof addBrandAssetSchema>;
export type UpdateBrandProfileInput = z.infer<typeof updateBrandProfileSchema>;
export type VerifyAssetDnsInput = z.infer<typeof verifyAssetDnsSchema>;
