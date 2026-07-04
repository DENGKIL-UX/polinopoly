import '@/lib/strict-mode-fix';

interface Payload { action: string; tileId?: number; propertyId?: number; }

export async function GET() {
  const fullState = safeArraySpread(require('@/lib/game-engine').getFullGameState());
  return new Response(fullState, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const res = await fetch('http://localhost:3000/full-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: request.body,
    });
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    const data = await res.json();
    return NextResponse.json(data, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}