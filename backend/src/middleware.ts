import { NextRequest, NextResponse } from 'next/server';

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Server-to-server, curl, or same-origin requests

  const configuredFrontend = process.env.FRONTEND_URL;
  const configuredCorsOrigin = process.env.CORS_ALLOWED_ORIGIN;

  if (configuredFrontend && (origin === configuredFrontend || origin === configuredFrontend.replace(/\/$/, ''))) {
    return true;
  }

  if (configuredCorsOrigin) {
    const allowed = configuredCorsOrigin.split(',').map((o) => o.trim());
    if (allowed.includes('*') || allowed.includes(origin)) {
      return true;
    }
  }

  // Local development origins
  if (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('https://localhost:')
  ) {
    return true;
  }

  // Vercel deployment preview and production domains
  if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = isOriginAllowed(origin);

  // Determine Access-Control-Allow-Origin header
  const allowOriginHeader = origin && allowed ? origin : '*';

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    const preflightHeaders = new Headers({
      'Access-Control-Allow-Origin': allowOriginHeader,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Cron-Secret',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });

    return new NextResponse(null, { status: 204, headers: preflightHeaders });
  }

  // Handle actual API requests
  // @ts-expect-error Next.js runtime provides NextResponse.next()
  const response = NextResponse.next();

  if (allowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Cron-Secret');

  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
