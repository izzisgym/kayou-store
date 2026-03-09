import { Suspense } from 'react';
import Link from 'next/link';
import { getCards } from '@/lib/woocommerce';
import { CardTile } from '@/components/cards/CardTile';
import { FilterBar } from '@/components/cards/FilterBar';
import type { Property } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kayou Cards — Official Marketplace',
};

interface HomeProps {
  searchParams: Promise<{ property?: string; rarity?: string; search?: string; page?: string }>;
}

export default async function HomePage({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const property = (sp.property as Property) || undefined;
  const rarity = sp.rarity || undefined;
  const search = sp.search || undefined;
  const page = parseInt(sp.page ?? '1', 10);

  const { cards, pagination } = await getCards({ property, rarity, search, page, perPage: 24 });

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white px-6 py-10 md:py-16 text-center">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
          Official Kayou Card Marketplace
        </h1>
        <p className="text-sm md:text-base text-white/70 max-w-xl mx-auto">
          Every card from every set. My Little Pony &amp; Naruto — shop, collect, make offers.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <Link
            href="/browse/my-little-pony"
            className="bg-pink-500 hover:bg-pink-400 text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors"
          >
            My Little Pony
          </Link>
          <Link
            href="/browse/naruto"
            className="bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-full px-5 py-2.5 text-sm transition-colors"
          >
            Naruto
          </Link>
        </div>
      </section>

      {/* Filters */}
      <Suspense>
        <FilterBar />
      </Suspense>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {pagination.total > 0 ? (
          <span>{pagination.total.toLocaleString()} cards found</span>
        ) : (
          <span>No cards found</span>
        )}
      </div>

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
              ...(property ? { property } : {}),
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
