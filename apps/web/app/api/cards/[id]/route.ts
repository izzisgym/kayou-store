import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCardById, updateCard, deleteCard } from '@/lib/woocommerce';
import type { UpdateCardInput } from '@/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const card = await getCardById(parseInt(id, 10));
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(card);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let input: UpdateCardInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const card = await updateCard(parseInt(id, 10), input);
    return NextResponse.json(card);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await deleteCard(parseInt(id, 10));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
