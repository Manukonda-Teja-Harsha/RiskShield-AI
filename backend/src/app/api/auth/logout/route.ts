import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const accessToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (accessToken) {
      await authService.logout(accessToken);
    }

    return NextResponse.json({
      success: true,
      message: 'Session signed out cleanly'
    });
  } catch {
    return NextResponse.json({
      success: true,
      message: 'Session cleared'
    });
  }
}
