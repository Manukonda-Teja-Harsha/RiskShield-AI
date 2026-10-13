import { brandRepository, normalizeAssetIdentifier, DbBrandAsset } from '../repositories/brand.repository';
import type { BrandOnboardingPayloadInput } from '../schemas/auth.schema';
import type { AddBrandAssetInput, UpdateBrandProfileInput } from '../schemas/brand.schema';

export class BrandService {
  async getUserWorkspaces(userId: string) {
    return brandRepository.findUserWorkspaces(userId);
  }

  async getBrandDetails(brandId: string) {
    return brandRepository.findBrandWithAssets(brandId);
  }

  async createBrandWorkspace(userId: string, payload: BrandOnboardingPayloadInput) {
    return brandRepository.createBrandWorkspaceWithOwner(userId, payload);
  }

  async updateBrandProfile(brandId: string, updates: Partial<UpdateBrandProfileInput>) {
    const dataToUpdate: Record<string, any> = {};

    if (updates.name) dataToUpdate.name = updates.name.trim();
    if (updates.description !== undefined) dataToUpdate.description = updates.description?.trim() || null;
    if (updates.website !== undefined) dataToUpdate.website = updates.website?.trim() || null;
    if (updates.category) dataToUpdate.category = updates.category.trim();
    if (updates.country !== undefined) dataToUpdate.country = updates.country?.trim() || null;
    if (updates.accentColor) dataToUpdate.accentColor = updates.accentColor.trim();
    if (updates.businessEmail !== undefined) dataToUpdate.businessEmail = updates.businessEmail?.trim() || null;
    if (updates.supportEmail !== undefined) dataToUpdate.supportEmail = updates.supportEmail?.trim() || null;
    if (updates.securityContactEmail !== undefined) dataToUpdate.securityContactEmail = updates.securityContactEmail?.trim() || null;
    if (updates.officialPhone !== undefined) dataToUpdate.officialPhone = updates.officialPhone?.trim() || null;

    return brandRepository.updateBrand(brandId, dataToUpdate);
  }

  async getBrandAssets(brandId: string): Promise<DbBrandAsset[]> {
    return brandRepository.findBrandAssets(brandId);
  }

  async addBrandAsset(brandId: string, input: Omit<AddBrandAssetInput, 'brandId'>): Promise<DbBrandAsset> {
    const brand = await brandRepository.findBrandById(brandId);
    if (!brand) {
      throw new Error('Brand workspace not found');
    }

    const normalizedValue = normalizeAssetIdentifier(input.value);
    const existingAssets = await brandRepository.findBrandAssets(brandId);
    const duplicate = existingAssets.find(
      (a) => a.type === input.type && a.normalizedValue === normalizedValue
    );

    if (duplicate) {
      throw new Error(`An asset with value "${input.value}" is already registered in this brand workspace.`);
    }

    const isDomain = input.type === 'DOMAIN' || input.type === 'SUBDOMAIN';
    const status = isDomain ? 'PENDING_DNS' : 'PENDING_VERIFICATION';
    const brandToken = typeof (brand as any).dnsTxtToken === 'string' ? (brand as any).dnsTxtToken : null;
    const dnsTxtRecord = isDomain ? (brandToken || `riskshield-verification=${Math.random().toString(36).substring(2, 12)}`) : undefined;

    return brandRepository.createBrandAsset({
      brandId,
      type: input.type,
      platform: input.platform,
      value: input.value.trim(),
      normalizedValue,
      status,
      dnsTxtRecord
    });
  }

  async deleteBrandAsset(brandId: string, assetId: string): Promise<boolean> {
    return brandRepository.deleteBrandAsset(assetId, brandId);
  }

  async verifyAssetDns(
    brandId: string,
    assetId: string
  ): Promise<{ verified: boolean; asset: DbBrandAsset; message: string }> {
    const asset = await brandRepository.findBrandAssetById(assetId);
    if (!asset || asset.brandId !== brandId) {
      throw new Error('Brand asset not found in this workspace');
    }

    if (asset.type !== 'DOMAIN' && asset.type !== 'SUBDOMAIN') {
      throw new Error('Only domain and subdomain assets can be verified via DNS TXT records');
    }

    if (asset.status === 'VERIFIED') {
      return {
        verified: true,
        asset,
        message: 'Asset has already been cryptographically verified'
      };
    }

    // In a production DNS environment, we query Node `dns.promises.resolveTxt(domain)`.
    // If the expected dnsTxtRecord is present in authoritative TXT records, mark as VERIFIED.
    // For test simulation / live challenges: verify whether the record exists.
    // Ensure that failed/missing DNS records NEVER get marked as VERIFIED!
    try {
      const dns = await import('dns/promises');
      const records = await dns.resolveTxt(asset.normalizedValue).catch(() => []);
      const flattened = records.flat();
      const expectedToken = asset.dnsTxtRecord || '';

      const isMatch = expectedToken && flattened.some((rec) => rec.includes(expectedToken));

      if (isMatch) {
        const updated = await brandRepository.updateBrandAsset(assetId, {
          status: 'VERIFIED',
          verifiedAt: new Date()
        });
        return {
          verified: true,
          asset: updated,
          message: 'DNS TXT challenge verified successfully on authoritative nameserver'
        };
      }

      return {
        verified: false,
        asset,
        message: `DNS TXT record not found for "${asset.normalizedValue}". Ensure TXT record "${expectedToken}" is published at host.`
      };
    } catch {
      return {
        verified: false,
        asset,
        message: `DNS resolution failed for "${asset.normalizedValue}". Asset remains in pending verification status.`
      };
    }
  }

  async getBrandFindings(brandId: string) {
    return brandRepository.findFindingsByBrand(brandId);
  }
}

export const brandService = new BrandService();
