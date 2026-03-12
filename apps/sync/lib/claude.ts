import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";
import type { WooProduct } from "@/lib/woocommerce";

function getClient() {
  if (!env.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey: env.anthropicApiKey });
}

export async function generateEbayListingCopy(
  product: WooProduct,
): Promise<{ title: string; description: string }> {
  const client = getClient();

  const categories = (product.categories ?? []).map((c) => c.name);

  const prompt = `You are an expert eBay listing copywriter specializing in trading cards.

Generate an eBay listing title and HTML description for the following trading card product.

Product name: ${product.name}
SKU: ${product.sku}
Price: $${product.regular_price || product.price || "0.00"}
Brand: Kayou
Categories: ${categories.length > 0 ? categories.join(", ") : "Trading Card"}
${product.description ? `WooCommerce description: ${product.description}` : ""}

Rules for the title:
- Maximum 80 characters (hard limit — eBay will reject longer titles)
- MUST follow this exact format: {Card Name} {Rarity} {SKU} Kayou {Franchise} English
- Example: "Rarity SGR MLPME02-SGR-005L5 Kayou My Little Pony English"
- Card Name = the name of the card (e.g. "Rarity", "Sunset Shimmer", "Scootaloo")
- Rarity = the rarity code from the product name in brackets without brackets (e.g. SGR, LSR, UR, SC, R)
- SKU = the full SKU exactly as provided: ${product.sku}
- Franchise = the series/franchise (e.g. My Little Pony, Kung Fu Panda) from the categories above
- No condition abbreviation, no special characters that eBay disallows (no: !, @, $, *, /, \\, <, >)
- If the result exceeds 80 characters, shorten the card name only — never cut the SKU

Rules for the description:
- Return clean HTML (no markdown)
- 2–4 short paragraphs
- Lead with the card name, rarity, series/franchise (${categories[0] ?? "Trading Card"}), and brand (Kayou)
- Mention condition (Near Mint / NM), that it ships in a protective sleeve, and fast shipping
- End with a brief trust statement

Respond with valid JSON only, no commentary:
{"title": "...", "description": "..."}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw =
    response.content[0]?.type === "text" ? response.content[0].text : "{}";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as { title?: string; description?: string })
    : {};

  const rawTitle = parsed.title ?? product.name;
  // Ensure SKU is always present — append if Claude dropped it
  const titleWithSku = rawTitle.includes(product.sku)
    ? rawTitle
    : `${rawTitle} ${product.sku}`;
  const title = titleWithSku.slice(0, 80);
  const description =
    parsed.description ||
    product.short_description ||
    product.description ||
    product.name;

  return { title, description };
}
