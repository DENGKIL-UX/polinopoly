import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const res = await fetch('http://localhost:3000/full-page', {
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