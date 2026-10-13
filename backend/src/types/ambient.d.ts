declare module 'next/server' {
  export class NextRequest extends Request {
    readonly nextUrl: URL;
  }

  export class NextResponse extends Response {
    static json<T>(body: T, init?: ResponseInit): NextResponse;
  }
}

declare module '@prisma/client' {
  export class PrismaClient {
    user: {
      findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      findFirst(args?: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
      create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      createMany(args: Record<string, unknown>): Promise<{ count: number }>;
      update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      upsert(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      delete(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
      count(args?: Record<string, unknown>): Promise<number>;
    };
    brand: {
      findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      findFirst(args?: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
      create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      createMany(args: Record<string, unknown>): Promise<{ count: number }>;
      update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      upsert(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      delete(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
      count(args?: Record<string, unknown>): Promise<number>;
    };
    brandMembership: {
      findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      findFirst(args?: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
      create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      createMany(args: Record<string, unknown>): Promise<{ count: number }>;
      update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      upsert(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      delete(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
      count(args?: Record<string, unknown>): Promise<number>;
    };
    brandAsset: {
      findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      findFirst(args?: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
      create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      createMany(args: Record<string, unknown>): Promise<{ count: number }>;
      update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      delete(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
      count(args?: Record<string, unknown>): Promise<number>;
    };
    scanRecord: {
      findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      findFirst(args?: Record<string, unknown>): Promise<Record<string, unknown> | null>;
      create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
      deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
      count(args?: Record<string, unknown>): Promise<number>;
    };
    brandThreatFinding: {
      create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
      deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
      count(args?: Record<string, unknown>): Promise<number>;
    };
    auditEvent: {
      create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
      findMany(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
    };
    $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T>;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }
}
