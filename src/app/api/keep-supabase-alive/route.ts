import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Validates the Authorization Bearer header against CRON_SECRET using timingSafeEqual
 * to protect against timing attacks.
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  // Support both "Bearer <token>" and "bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return false;
  }

  const token = parts[1];
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(cronSecret);

  if (tokenBuffer.length !== secretBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, secretBuffer);
}

/**
 * Endpoint called by Vercel Cron (or manual trigger) to keep Supabase alive
 * by invoking the lightweight PostgreSQL RPC function `keep_alive()`.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'CRON_SECRET environment variable is not configured',
      },
      { status: 500 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  try {
    // Invoke the lightweight keep_alive() RPC function on Supabase PostgreSQL
    const { data, error } = await supabase.rpc('keep_alive');

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          hint: 'Ensure public.keep_alive() SQL function is created in Supabase (see schema.sql)',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase keep-alive ping successful',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
