import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCards } from '@/lib/woocommerce';
import { CardTile } from '@/components/cards/CardTile';
import { FilterBar } from '@/components/cards/FilterBar';
import type { Property } from '@/types';
import type { Metadata } from 'next';

const PROPERTY_META: Record<Property, { title: string; color: string; description: string }> = {
  'my-little-pony': {
    title: 'My Little Pony',
    color: 'from-pink-600 to-purple-600',
    description: 'Complete your My Little Pony Kayou card collection. R, SR, SSR, SP rarities and more.',
  },
  naruto: {
    title: 'Naruto',
    color: 'from-orange-500 to-red-600',
    description: 'Shop all Naruto Kayou trading cards. R through HR — find your rarest cards here.',
  },
};

interface BrowsePageProps {
  params: Promise<{ property: string }>;
  searchParams: Promise<{ rarity?: string; search?: string; page?: string }>;
}

export async function generateMetadata({ params }: BrowsePageProps): Promise<Metadata> {
  const { property } = await params;
  const meta = PROPERTY_META[property as Property];
  if (!meta) return {};
  return { title: `${meta.title} Cards`, description: meta.description };
}

export default async function BrowsePage({ params, searchParams }: BrowsePageProps) {
  const { property: propertySlug } = await params;
  const sp = await searchParams;

  if (!PROPERTY_META[propertySlug as Property]) notFound();

  const property = propertySlug as Property;
  const meta = PROPERTY_META[property];
  const rarity = sp.rarity || undefined;
  const search = sp.search || undefined;
  const page = parseInt(sp.page ?? '1', 10);

  const { cards, pagination } = await getCards({ property, rarity, search, page, perPage: 24 });

  return (
    <div className="flex flex-col gap-6">
      {/* Property banner */}
      <section className={`rounded-3xl bg-gradient-to-br ${meta.color} text-white px-6 py-8 md:py-12`}>
        <Link href="/" className="text-white/60 text-xs mb-2 block hover:text-white/80">← All Cards</Link>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight">{meta.title}</h1>
        <p className="text-sm text-white/70 mt-1 max-w-md">{meta.description}</p>
        <p className="text-sm text-white/50 mt-3">{pagination.total.toLocaleString()} cards</p>
      </section>

      {/* Filters */}
      <Suspense>
        <FilterBar property={property} />
      </Suspense>

      {/* Grid */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {cards.map((card) => (
            <CardTile key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl font-semibold mb-2">No cards found</p>
          <p className="text-sm">Try adjusting your filters.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams({
              ...(rarity ? { rarity } : {}),
              ...(search ? { search } : {}),
              page: String(p),
            });
            return (
              <Link
                key={p}
                href={`?${params}`}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold border transition-colors ${
                  p === page
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
