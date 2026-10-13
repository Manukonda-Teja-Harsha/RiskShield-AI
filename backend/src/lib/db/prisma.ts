import type { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  try {
    const req = createRequire(import.meta.url);
    const mod = req('@prisma/client') as { PrismaClient: new () => PrismaClient };
    return new mod.PrismaClient();
  } catch {
    const uninitializedHandler = () => {
      throw new Error(
        'Prisma Client is not generated or DATABASE_URL is not configured. Run `npm run db:generate --workspace=backend` after setting DATABASE_URL.'
      );
    };
    return new Proxy({} as PrismaClient, {
      get() {
        return new Proxy(
          {},
          {
            get() {
              return uninitializedHandler;
            }
          }
        );
      }
    });
  }
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
