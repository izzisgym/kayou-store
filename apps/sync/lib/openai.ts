import OpenAI from "openai";

import { env } from "@/lib/env";
import type { WooProduct } from "@/lib/woocommerce";

function getClient() {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: env.openaiApiKey });
}

export async function generateEbayListingCopy(
  product: WooProduct,
): Promise<{ title: string; description: string }> {
  const client = getClient();

  const prompt = `You are an expert eBay listing copywriter specializing in trading cards.

Generate an eBay listing title and HTML description for the following trading card product.

Product name: ${product.name}
SKU: ${product.sku}
Price: $${product.regular_price || product.price || "0.00"}
${product.description ? `WooCommerce description: ${product.description}` : ""}

Rules for the title:
- Maximum 80 characters (hard limit — eBay will reject longer titles)
- Include the full card name, rarity/variant in brackets if present in the name (e.g. [SGR], [LSR], [UR])
- Include the brand/series if identifiable from the name or SKU (e.g. Kayou, Kung Fu Panda)
- Include condition: "Near Mint" or "NM"
- No special characters that eBay disallows (no: !, @, $, *, /, \\, <, >)

Rules for the description:
- Return clean HTML (no markdown)
- 2–4 short paragraphs
- Lead with the card name, rarity, and series
- Mention condition (Near Mint / NM), that it ships in a protective sleeve, and fast shipping
- End with a brief trust statement

Respond with valid JSON only, no commentary:
{"title": "...", "description": "..."}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { title?: string; description?: string };

  const title = (parsed.title ?? product.name).slice(0, 80);
  const description =
    parsed.description ||
    product.short_description ||
    product.description ||
    product.name;

  return { title, description };
}
