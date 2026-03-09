'use client';

import type { Property } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';

const RARITIES = ['R', 'SR', 'SSR', 'TR', 'TGR', 'HR', 'SP', 'UR'];

interface FilterBarProps {
  property?: Property;
}

export function FilterBar({ property }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentRarity = searchParams.get('rarity') ?? '';
  const currentSearch = searchParams.get('search') ?? '';

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <div className={`flex flex-col gap-3 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="relative">
        <input
          type="search"
          placeholder="Search cards…"
          defaultValue={currentSearch}
          onChange={(e) => update('search', e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => update('rarity', '')}
          className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
            !currentRarity
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          All
        </button>
        {RARITIES.map((r) => (
          <button
            key={r}
            onClick={() => update('rarity', r === currentRarity ? '' : r)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              currentRarity === r
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {!property && (
        <div className="flex gap-2">
          <button
            onClick={() => update('property', '')}
            className={`flex-1 rounded-xl py-2 text-sm font-medium border transition-colors ${
              !searchParams.get('property')
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => update('property', 'my-little-pony')}
            className={`flex-1 rounded-xl py-2 text-sm font-medium border transition-colors ${
              searchParams.get('property') === 'my-little-pony'
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            My Little Pony
          </button>
          <button
            onClick={() => update('property', 'naruto')}
            className={`flex-1 rounded-xl py-2 text-sm font-medium border transition-colors ${
              searchParams.get('property') === 'naruto'
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            Naruto
          </button>
        </div>
      )}
    </div>
  );
}
