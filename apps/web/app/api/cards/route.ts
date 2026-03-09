import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCards, createCard } from '@/lib/woocommerce';
import type { CreateCardInput, Property } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const property = searchParams.get('property') as Property | undefined;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(searchParams.get('per_page') ?? '24', 10);
  const search = searchParams.get('search') ?? undefined;
  const rarity = searchParams.get('rarity') ?? undefined;

  try {
    const result = await getCards({ property, page, perPage, search, rarity });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let input: CreateCardInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!input.name || !input.property || !input.set || !input.cardNumber || !input.rarity) {
    return NextResponse.json(
      { error: 'Missing required fields: name, property, set, cardNumber, rarity' },
      { status: 400 },
    );
  }

  try {
    const card = await createCard(input);
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
