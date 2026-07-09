import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Build the URL relative to the current request origin so it works
    // in both dev (localhost:3000) and production (Cloudflare Workers).
    const origin = request.nextUrl.origin;
    const res = await fetch(`${origin}/api/full-page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: request.body,
    });
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 });

    const data = await res.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
  } catch {
    // SECURITY: Don't expose internal error messages to clients
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
