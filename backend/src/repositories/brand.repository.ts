import { prisma } from '../lib/db/prisma';
import type { BrandOnboardingPayloadInput } from '../schemas/auth.schema';

export interface DbBrandAsset {
  id: string;
  brandId: string;
  type: 'DOMAIN' | 'SUBDOMAIN' | 'SOCIAL_HANDLE' | 'TRADEMARK' | 'MERCHANT' | 'MOBILE_APP' | 'CONTACT_CHANNEL';
  platform: string | null;
  value: string;
  normalizedValue: string;
  status: 'PENDING_VERIFICATION' | 'PENDING_DNS' | 'VERIFIED' | 'DISPUTED' | 'REJECTED';
  dnsTxtRecord: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function normalizeAssetIdentifier(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

function mapBrandTypeToEnum(
  brandType: BrandOnboardingPayloadInput['brandType']
): 'COMPANY_PRODUCT' | 'CREATOR_PUBLIC_FIGURE' | 'GOVERNMENT_INSTITUTION' | 'MARKETPLACE_SELLER' {
  switch (brandType) {
    case 'creator_public_figure':
      return 'CREATOR_PUBLIC_FIGURE';
    case 'government_institution':
      return 'GOVERNMENT_INSTITUTION';
    case 'marketplace_seller':
      return 'MARKETPLACE_SELLER';
    default:
      return 'COMPANY_PRODUCT';
  }
}

export class BrandRepository {
  async findBrandById(brandId: string) {
    return prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        officialAssets: true
      }
    });
  }

  async findBrandWithAssets(brandId: string) {
    return prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        officialAssets: {
          orderBy: { createdAt: 'desc' }
        },
        memberships: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            userId: true,
            role: true,
            status: true
          }
        }
      }
    });
  }

  async findUserWorkspaces(userId: string) {
    const memberships = (await prisma.brandMembership.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        brand: {
          include: {
            officialAssets: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })) as any[];

    return memberships
      .filter((m) => m.brand)
      .map((m) => ({
        membershipId: m.id,
        role: m.role as 'OWNER' | 'ADMIN' | 'MEMBER',
        status: m.status,
        brand: m.brand
      }));
  }

  async findMembership(userId: string, brandId: string) {
    return prisma.brandMembership.findUnique({
      where: {
        userId_brandId: {
          userId,
          brandId
        }
      },
      include: {
        brand: true
      }
    });
  }

  async findFindingsByBrand(brandId: string) {
    return prisma.brandThreatFinding.findMany({
      where: { brandId },
      orderBy: { detectedAt: 'desc' }
    });
  }

  async upsertThreatFinding(data: {
    brandId: string;
    target: string;
    platform?: string;
    severity?: string;
    riskScore: number;
    detectionReason: string;
    officialAssetCompared?: string | null;
    evidence: any;
  }) {
    const threatModel = (prisma as any).brandThreatFinding;
    const existing = await threatModel.findFirst({
      where: {
        brandId: data.brandId,
        target: data.target
      }
    });

    if (existing) {
      return threatModel.update({
        where: { id: existing.id },
        data: {
          riskScore: Math.max(existing.riskScore, data.riskScore),
          severity: data.severity || existing.severity,
          detectionReason: data.detectionReason,
          evidence: data.evidence,
          repeatScanCount: { increment: 1 },
          updatedAt: new Date()
        }
      });
    }

    return threatModel.create({
      data: {
        brandId: data.brandId,
        target: data.target,
        platform: data.platform || 'DOMAIN',
        severity: data.severity || 'high',
        riskScore: data.riskScore,
        status: 'NEW',
        detectionReason: data.detectionReason,
        officialAssetCompared: data.officialAssetCompared || null,
        evidence: data.evidence,
        repeatScanCount: 1
      }
    });
  }

  async findBrandAssets(brandId: string): Promise<DbBrandAsset[]> {
    const assets = await prisma.brandAsset.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' }
    });
    return assets as unknown as DbBrandAsset[];
  }

  async findBrandAssetById(assetId: string): Promise<DbBrandAsset | null> {
    const asset = await prisma.brandAsset.findUnique({
      where: { id: assetId }
    });
    return (asset as unknown as DbBrandAsset) || null;
  }

  async createBrandAsset(data: {
    brandId: string;
    type: 'DOMAIN' | 'SUBDOMAIN' | 'SOCIAL_HANDLE' | 'TRADEMARK' | 'MERCHANT' | 'MOBILE_APP' | 'CONTACT_CHANNEL';
    platform?: string;
    value: string;
    normalizedValue: string;
    status: 'PENDING_VERIFICATION' | 'PENDING_DNS' | 'VERIFIED' | 'DISPUTED' | 'REJECTED';
    dnsTxtRecord?: string;
  }): Promise<DbBrandAsset> {
    const created = await prisma.brandAsset.create({
      data: {
        brandId: data.brandId,
        type: data.type,
        platform: data.platform || null,
        value: data.value,
        normalizedValue: data.normalizedValue,
        status: data.status,
        dnsTxtRecord: data.dnsTxtRecord || null
      }
    });
    return created as unknown as DbBrandAsset;
  }

  async deleteBrandAsset(assetId: string, brandId: string): Promise<boolean> {
    const target = await prisma.brandAsset.findFirst({
      where: { id: assetId, brandId }
    });
    if (!target) return false;

    await prisma.brandAsset.delete({
      where: { id: assetId }
    });
    return true;
  }

  async updateBrandAsset(
    assetId: string,
    data: {
      status?: 'PENDING_VERIFICATION' | 'PENDING_DNS' | 'VERIFIED' | 'DISPUTED' | 'REJECTED';
      verifiedAt?: Date | null;
      dnsTxtRecord?: string | null;
    }
  ): Promise<DbBrandAsset> {
    const updated = await prisma.brandAsset.update({
      where: { id: assetId },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.verifiedAt !== undefined ? { verifiedAt: data.verifiedAt } : {}),
        ...(data.dnsTxtRecord !== undefined ? { dnsTxtRecord: data.dnsTxtRecord } : {})
      }
    });
    return updated as unknown as DbBrandAsset;
  }

  async updateBrand(brandId: string, data: Record<string, any>) {
    return prisma.brand.update({
      where: { id: brandId },
      data
    });
  }

  /**
   * Persists a Brand Workspace, its initial reference assets (always `PENDING_VERIFICATION`),
   * and an `OWNER` `BrandMembership` for the authenticated user.
   */
  async createBrandWorkspaceWithOwner(userId: string, payload: BrandOnboardingPayloadInput) {
    const baseSlug =
      payload.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'brand-workspace';

    const existingSlug = await prisma.brand.findUnique({ where: { slug: baseSlug } });
    const slug = existingSlug ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

    const initials =
      payload.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'BW';

    const dnsTxtToken = `riskshield-verification=${Math.random().toString(36).substring(2, 12)}`;
    const primaryUrl = payload.officialWebsite || payload.primaryIdentityUrl || '';
    const cleanWebsite = primaryUrl
      ? primaryUrl.startsWith('http')
        ? primaryUrl
        : `https://${primaryUrl}`
      : null;

    // 1. Create Brand with explicit PENDING_VERIFICATION status
    const brandRecord = await prisma.brand.create({
      data: {
        name: payload.name.trim(),
        slug,
        brandType: mapBrandTypeToEnum(payload.brandType),
        category: payload.industry.trim(),
        country: payload.country || 'Global',
        website: cleanWebsite,
        description: payload.description || `${payload.name.trim()} official brand workspace.`,
        logoInitial: initials,
        accentColor: '#FF5500',
        businessEmail: payload.contacts?.businessEmail || null,
        supportEmail: payload.contacts?.supportEmail || null,
        securityContactEmail: payload.contacts?.securityContactEmail || null,
        officialPhone: payload.contacts?.officialPhone || null,
        status: 'PENDING_VERIFICATION',
        dnsTxtToken
      }
    });

    const brandId = String(brandRecord.id);

    // 2. Create OWNER BrandMembership
    const membershipRecord = await prisma.brandMembership.upsert({
      where: {
        userId_brandId: {
          userId,
          brandId
        }
      },
      update: {
        role: 'OWNER',
        status: 'ACTIVE'
      },
      create: {
        userId,
        brandId,
        role: 'OWNER',
        status: 'ACTIVE'
      }
    });

    // 3. Collect and persist initial BrandAssets (always PENDING_VERIFICATION)
    const assetsToCreate: Array<{
      brandId: string;
      type: 'DOMAIN' | 'SUBDOMAIN' | 'SOCIAL_HANDLE' | 'MOBILE_APP' | 'CONTACT_CHANNEL' | 'TRADEMARK';
      platform?: string;
      value: string;
      normalizedValue: string;
      status: 'PENDING_VERIFICATION';
      dnsTxtRecord?: string;
    }> = [];

    const primaryDomain = payload.officialWebsite || payload.primaryIdentityUrl;
    if (primaryDomain && primaryDomain.trim()) {
      assetsToCreate.push({
        brandId,
        type: 'DOMAIN',
        value: primaryDomain.trim(),
        normalizedValue: normalizeAssetIdentifier(primaryDomain),
        status: 'PENDING_VERIFICATION',
        dnsTxtRecord: dnsTxtToken
      });
    }

    for (const dom of payload.additionalDomains || []) {
      if (dom && dom.trim()) {
        assetsToCreate.push({
          brandId,
          type: 'DOMAIN',
          value: dom.trim(),
          normalizedValue: normalizeAssetIdentifier(dom),
          status: 'PENDING_VERIFICATION',
          dnsTxtRecord: dnsTxtToken
        });
      }
    }

    for (const soc of payload.socialProfiles || []) {
      if (soc.urlOrHandle && soc.urlOrHandle.trim()) {
        assetsToCreate.push({
          brandId,
          type: 'SOCIAL_HANDLE',
          platform: soc.platform,
          value: soc.urlOrHandle.trim(),
          normalizedValue: normalizeAssetIdentifier(soc.urlOrHandle),
          status: 'PENDING_VERIFICATION'
        });
      }
    }

    for (const app of payload.apps || []) {
      const val = app.packageId || app.bundleId || app.storeUrl || app.name;
      if (val && val.trim()) {
        assetsToCreate.push({
          brandId,
          type: 'MOBILE_APP',
          platform: app.platform,
          value: val.trim(),
          normalizedValue: normalizeAssetIdentifier(val),
          status: 'PENDING_VERIFICATION'
        });
      }
    }

    if (payload.contacts?.businessEmail) {
      assetsToCreate.push({
        brandId,
        type: 'CONTACT_CHANNEL',
        platform: 'Business Email',
        value: payload.contacts.businessEmail.trim(),
        normalizedValue: payload.contacts.businessEmail.trim().toLowerCase(),
        status: 'PENDING_VERIFICATION'
      });
    }

    for (const alias of payload.alternativeNames || []) {
      if (alias && alias.trim()) {
        assetsToCreate.push({
          brandId,
          type: 'TRADEMARK',
          platform: 'Brand Alias',
          value: alias.trim(),
          normalizedValue: alias.trim().toLowerCase(),
          status: 'PENDING_VERIFICATION'
        });
      }
    }

    if (assetsToCreate.length > 0) {
      await prisma.brandAsset.createMany({
        data: assetsToCreate
      });
    }

    // 4. Elevate user role to BRAND_OWNER
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'BRAND_OWNER' }
    });

    return {
      brand: brandRecord,
      membership: membershipRecord,
      assetsCreatedCount: assetsToCreate.length
    };
  }
}

export const brandRepository = new BrandRepository();
