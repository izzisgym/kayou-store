import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCardBySlug, getAllCardSlugs } from '@/lib/woocommerce';
import type { Metadata } from 'next';

interface CardPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const slugs = await getAllCardSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CardPageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) return {};
  return {
    title: card.name,
    description: card.description || `Buy ${card.name} — ${card.rarity} rarity Kayou trading card.`,
  };
}

export const revalidate = 60;

export default async function CardPage({ params }: CardPageProps) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) notFound();

  const propertyHref = `/browse/${card.property}`;
  const propertyLabel = card.property === 'my-little-pony' ? 'My Little Pony' : 'Naruto';
  const image = card.images[0];
  const price = card.price ? parseFloat(card.price) : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <Link href="/" className="hover:text-gray-600">Home</Link>
        <span>/</span>
        <Link href={propertyHref} className="hover:text-gray-600">{propertyLabel}</Link>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-[200px]">{card.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="relative aspect-[3/4] rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          {image ? (
            <Image
              src={image.src}
              alt={image.alt || card.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain p-4"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300 text-sm">
              No Image
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          <div>
            <Link href={propertyHref} className="text-xs font-semibold text-indigo-600 hover:underline mb-1 block">
              {propertyLabel}
            </Link>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{card.name}</h1>
            <p className="text-sm text-gray-400 mt-1">{card.set} · Card #{card.cardNumber}</p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
              {card.rarity}
            </span>
            <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
              SKU: {card.sku}
            </span>
            {card.inStock ? (
              <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                {card.stockQuantity} in stock
              </span>
            ) : (
              <span className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1 rounded-full">
                Out of stock
              </span>
            )}
          </div>

          {/* Price */}
          <div className="border-t border-gray-100 pt-4">
            {price ? (
              <p className="text-3xl font-black text-gray-900">${price.toFixed(2)}</p>
            ) : (
              <p className="text-gray-400 text-sm">Price not set</p>
            )}
          </div>

          {/* CTA */}
          {card.ebayListingUrl ? (
            <div className="flex flex-col gap-3">
              <a
                href={card.ebayListingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-xl py-3.5 px-6 text-base transition-colors"
              >
                Buy on eBay
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
              <a
                href={card.ebayListingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl py-3 px-6 text-sm border border-gray-200 transition-colors"
              >
                Make an Offer on eBay
              </a>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              Listing coming soon. Check back later.
            </div>
          )}

          {/* Description */}
          {card.description && (
            <div className="border-t border-gray-100 pt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
              <div
                className="text-sm text-gray-500 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: card.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
