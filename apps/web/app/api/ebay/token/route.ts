import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEbayToken } from '@/lib/ebay';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = await getEbayToken();
    return NextResponse.json({ success: true, tokenPreview: token.slice(0, 20) + '...' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
