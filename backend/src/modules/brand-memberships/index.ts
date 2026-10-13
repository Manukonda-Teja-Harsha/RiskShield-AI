import { prisma } from '../../lib/db/prisma';

export class BrandMembershipModule {
  async verifyUserMembership(userId: string, brandId: string): Promise<boolean> {
    const record = await prisma.brandMembership.findUnique({
      where: {
        userId_brandId: { userId, brandId }
      }
    });
    return record !== null;
  }
}

export const brandMembershipModule = new BrandMembershipModule();
