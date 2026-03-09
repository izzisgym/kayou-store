'use client';

import type { KayouCard } from '@/types';
import { useState } from 'react';
import Link from 'next/link';

interface AdminCardRowProps {
  card: KayouCard;
}

export function AdminCardRow({ card }: AdminCardRowProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleEbaySync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/ebay/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult({ success: true, message: 'Synced! Listing live.' });
        // Refresh to show updated eBay info
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncResult({ success: false, message: data.error ?? 'Sync failed' });
      }
    } catch {
      setSyncResult({ success: false, message: 'Network error' });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <tr className="hover:bg-gray-800/40 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-white line-clamp-1">{card.name}</p>
          <p className="text-xs text-gray-500">{card.property === 'my-little-pony' ? 'MLP' : 'Naruto'} · {card.set}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{card.sku}</td>
      <td className="px-4 py-3">
        <span className="text-xs font-bold bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
          {card.rarity}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-medium">
        {card.price ? `$${parseFloat(card.price).toFixed(2)}` : <span className="text-gray-600">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={card.stockQuantity > 0 ? 'text-emerald-400' : 'text-red-400'}>
          {card.stockQuantity}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {card.ebayListingId ? (
          <a
            href={card.ebayListingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-yellow-400 hover:underline"
          >
            Live ↗
          </a>
        ) : (
          <span className="text-xs text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {syncResult && (
            <span className={`text-xs ${syncResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {syncResult.message}
            </span>
          )}
          <button
            onClick={handleEbaySync}
            disabled={syncing || !card.price}
            title={!card.price ? 'Set a price first' : 'Sync to eBay'}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-semibold text-xs rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap"
          >
            {syncing ? '…' : card.ebayListingId ? 'Re-sync eBay' : 'Sync eBay'}
          </button>
          <Link
            href={`/admin/cards/${card.id}/edit`}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs rounded-lg px-2.5 py-1.5 transition-colors"
          >
            Edit
          </Link>
        </div>
      </td>
    </tr>
  );
}
