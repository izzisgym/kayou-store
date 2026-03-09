import { getCards } from '@/lib/woocommerce';
import Link from 'next/link';
import type { Property } from '@/types';
import { AdminCardRow } from '@/components/admin/AdminCardRow';

interface AdminDashboardProps {
  searchParams: Promise<{ property?: string; page?: string; search?: string }>;
}

export default async function AdminDashboard({ searchParams }: AdminDashboardProps) {
  const sp = await searchParams;
  const property = (sp.property as Property) || undefined;
  const page = parseInt(sp.page ?? '1', 10);
  const search = sp.search || undefined;

  let cards: Awaited<ReturnType<typeof getCards>>['cards'] = [];
  let pagination: Awaited<ReturnType<typeof getCards>>['pagination'] | null = null;

  try {
    const result = await getCards({ property, page, perPage: 25, search });
    cards = result.cards;
    pagination = result.pagination;
  } catch {
    // WooCommerce not configured yet
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Card Inventory</h1>
          {pagination && (
            <p className="text-gray-400 text-sm mt-0.5">{pagination.total.toLocaleString()} total cards</p>
          )}
        </div>
        <Link
          href="/admin/cards/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          + Add Card
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <form className="flex-1" action="/admin">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search cards…"
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>
        <div className="flex gap-2">
          {[
            { label: 'All', value: '' },
            { label: 'MLP', value: 'my-little-pony' },
            { label: 'Naruto', value: 'naruto' },
          ].map(({ label, value }) => (
            <Link
              key={value}
              href={`/admin?property=${value}`}
              className={`rounded-xl px-3 py-2 text-sm font-semibold border transition-colors ${
                (property ?? '') === value
                  ? 'bg-white text-gray-900 border-white'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Cards table */}
      {cards.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-xl font-semibold mb-2">No cards yet</p>
          <p className="text-sm mb-4">
            {pagination === null
              ? 'WooCommerce is not connected. Add environment variables to get started.'
              : 'Add your first card to get started.'}
          </p>
          <Link href="/admin/cards/new" className="text-indigo-400 hover:underline text-sm">
            Add your first card →
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Card</th>
                  <th className="text-left px-4 py-3">SKU</th>
                  <th className="text-left px-4 py-3">Rarity</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Stock</th>
                  <th className="text-center px-4 py-3">eBay</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {cards.map((card) => (
                  <AdminCardRow key={card.id} card={card} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin?page=${p}${property ? `&property=${property}` : ''}${search ? `&search=${search}` : ''}`}
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold border transition-colors ${
                p === page
                  ? 'bg-white text-gray-900 border-white'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
