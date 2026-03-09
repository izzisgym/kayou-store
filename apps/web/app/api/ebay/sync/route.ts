import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncCardToEbay } from '@/lib/ebay';
import { getCardById, updateCardEbayMeta } from '@/lib/woocommerce';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    cardId: number;
    categoryId: string;
    merchantLocationKey: string;
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { cardId, categoryId, merchantLocationKey, fulfillmentPolicyId, paymentPolicyId, returnPolicyId } = body;

  if (!cardId) {
    return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
  }

  const card = await getCardById(cardId);
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  if (!card.price || parseFloat(card.price) <= 0) {
    return NextResponse.json({ error: 'Card must have a valid price before syncing to eBay' }, { status: 400 });
  }

  const policies = {
    categoryId: categoryId ?? process.env.EBAY_CATEGORY_ID ?? '183454',
    merchantLocationKey: merchantLocationKey ?? process.env.EBAY_MERCHANT_LOCATION_KEY ?? 'default',
    fulfillmentPolicyId: fulfillmentPolicyId ?? process.env.EBAY_FULFILLMENT_POLICY_ID ?? '',
    paymentPolicyId: paymentPolicyId ?? process.env.EBAY_PAYMENT_POLICY_ID ?? '',
    returnPolicyId: returnPolicyId ?? process.env.EBAY_RETURN_POLICY_ID ?? '',
  };

  const result = await syncCardToEbay(card, policies);

  if (result.success && result.listingId && result.listingUrl) {
    await updateCardEbayMeta(cardId, result.listingId, result.listingUrl);
  }

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
