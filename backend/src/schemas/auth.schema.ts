import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerPersonalSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const brandSocialProfileSchema = z.object({
  platform: z.string().trim().min(1),
  urlOrHandle: z.string().trim().min(2)
});

export const brandAppAssetSchema = z.object({
  platform: z.enum(['iOS', 'Android', 'Desktop', 'Extension']),
  name: z.string().trim().min(1),
  packageId: z.string().trim().optional(),
  bundleId: z.string().trim().optional(),
  storeUrl: z.string().trim().optional()
});

export const brandOnboardingPayloadSchema = z.object({
  brandType: z
    .enum(['company_product', 'creator_public_figure', 'government_institution', 'marketplace_seller'])
    .default('company_product'),
  name: z.string().trim().min(2, 'Brand or entity name is required'),
  primaryIdentityUrl: z.string().trim().optional().default(''),
  industry: z.string().trim().min(1, 'Industry or category is required'),
  country: z.string().trim().optional().default('Global'),
  description: z.string().trim().optional().default(''),
  officialWebsite: z.string().trim().optional().default(''),
  additionalDomains: z.array(z.string().trim()).optional().default([]),
  socialProfiles: z.array(brandSocialProfileSchema).optional().default([]),
  apps: z.array(brandAppAssetSchema).optional().default([]),
  contacts: z
    .object({
      businessEmail: z.string().trim().email('Valid business contact email is required'),
      supportEmail: z.string().trim().optional(),
      securityContactEmail: z.string().trim().optional(),
      officialPhone: z.string().trim().optional(),
      headquartersRegion: z.string().trim().optional()
    })
    .optional(),
  alternativeNames: z.array(z.string().trim()).optional().default([])
});

export const registerRequestSchema = z.discriminatedUnion('accountType', [
  z.object({
    accountType: z.literal('personal'),
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    email: z.string().trim().email('Please provide a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  }),
  z.object({
    accountType: z.literal('brand'),
    fullName: z.string().trim().min(2, 'Owner full name must be at least 2 characters'),
    email: z.string().trim().email('Please provide a valid owner email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    brandOnboarding: brandOnboardingPayloadSchema
  })
]);

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address')
});

export type LoginRequestInput = z.infer<typeof loginRequestSchema>;
export type RegisterPersonalInput = z.infer<typeof registerPersonalSchema>;
export type BrandOnboardingPayloadInput = z.infer<typeof brandOnboardingPayloadSchema>;
export type RegisterRequestInput = z.infer<typeof registerRequestSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
