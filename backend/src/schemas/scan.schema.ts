import { z } from 'zod';

export const scannerContextPayloadSchema = z.object({
  category: z.enum(['url', 'message', 'phone', 'social', 'job', 'payment', 'app', 'product', 'other']),
  primaryInput: z.string().min(1),
  channel: z.string().optional(),
  senderInfo: z.string().optional(),
  emailSubject: z.string().optional(),
  requestedAction: z.string().optional(),
  containedUrl: z.string().optional(),
  claimedEntity: z.string().optional(),
  isOpened: z.boolean().optional(),
  enteredSensitiveInfo: z.string().optional(),
  isImpersonating: z.boolean().optional(),
  impersonatedEntity: z.string().optional(),
  isPaymentRequested: z.boolean().optional(),
  paymentDetails: z.string().optional(),
  hasTransferredMoney: z.boolean().optional(),
  requestedAmount: z.string().optional(),
  appSource: z.string().optional(),
  appPackageId: z.string().optional(),
  notes: z.string().optional()
});

export const personalScanRequestSchema = z.object({
  target: z.string().min(1, 'Scan indicator cannot be empty').max(4000),
  mode: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().optional(),
  contextPayload: scannerContextPayloadSchema.optional()
});

export const brandScanRequestSchema = z.object({
  target: z.string().min(1, 'Scan indicator cannot be empty').max(4000),
  brandId: z.string().min(1, 'Brand workspace ID is required'),
  brandName: z.string().min(1, 'Brand name is required'),
  contextPayload: scannerContextPayloadSchema.optional()
});

export type PersonalScanRequestInput = z.infer<typeof personalScanRequestSchema>;
export type BrandScanRequestInput = z.infer<typeof brandScanRequestSchema>;
