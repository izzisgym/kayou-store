'use client';

import type { KayouCard } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EditCardFormProps {
  card: KayouCard;
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

export function EditCardForm({ card }: EditCardFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [price, setPrice] = useState(card.price ?? '');
  const [stock, setStock] = useState(String(card.stockQuantity ?? 0));
  const [autoAccept, setAutoAccept] = useState(card.ebayAutoAcceptPrice ?? '');
  const [autoDecline, setAutoDecline] = useState(card.ebayAutoDeclinePrice ?? '');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price,
          stockQuantity: parseInt(stock, 10),
          ebayAutoAcceptPrice: autoAccept || undefined,
          ebayAutoDeclinePrice: autoDecline || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
      } else {
        setSuccess('Saved successfully.');
        router.refresh();
      }
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEbaySync() {
    setSyncing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/ebay/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`eBay listing live! ID: ${data.listingId}`);
        router.refresh();
      } else {
        setError(data.error ?? 'eBay sync failed');
      }
    } catch {
      setError('Network error.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${card.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/cards/${card.id}`, { method: 'DELETE' });
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Failed to delete card.');
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card info (read-only) */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-start gap-3">
          {card.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.images[0].src} alt={card.name} className="w-16 h-20 object-contain rounded-lg bg-gray-800" />
          )}
          <div>
            <p className="text-xs text-gray-500 font-mono">{card.sku}</p>
            <h2 className="font-bold text-white">{card.name}</h2>
            <div className="flex gap-2 mt-1">
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{card.rarity}</span>
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{card.set}</span>
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">#{card.cardNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-sm text-gray-300">Pricing & Inventory</h3>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)">
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="0"
              placeholder="9.99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Stock Quantity">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <h3 className="font-semibold text-sm text-gray-300 mb-3">eBay Best Offer Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Auto-Accept Price (USD)" hint="Automatically accept offers at or above this price">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                min="0"
                placeholder="7.99"
                value={autoAccept}
                onChange={(e) => setAutoAccept(e.target.value)}
              />
            </Field>
            <Field label="Auto-Decline Price (USD)" hint="Automatically decline offers at or below this price">
              <input
                className={inputClass}
                type="number"
                step="0.01"
                min="0"
                placeholder="3.00"
                value={autoDecline}
                onChange={(e) => setAutoDecline(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {success && (
          <p className="text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">{success}</p>
        )}
        {error && (
          <p className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* eBay sync */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <h3 className="font-semibold text-sm text-gray-300 mb-1">eBay Listing</h3>
        {card.ebayListingId ? (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Current listing ID: <span className="text-gray-300 font-mono">{card.ebayListingId}</span></p>
            {card.ebayListingUrl && (
              <a href={card.ebayListingUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 text-xs hover:underline">
                View on eBay ↗
              </a>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-3">No eBay listing yet. Sync this card to publish it on eBay with Best Offer enabled.</p>
        )}
        <button
          onClick={handleEbaySync}
          disabled={syncing || !price}
          title={!price ? 'Set a price before syncing' : undefined}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold rounded-xl py-2.5 text-sm transition-colors"
        >
          {syncing ? 'Syncing to eBay…' : card.ebayListingId ? 'Re-sync to eBay' : 'Sync to eBay'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-gray-900 rounded-2xl border border-red-900/50 p-6">
        <h3 className="font-semibold text-sm text-red-400 mb-2">Danger Zone</h3>
        <p className="text-xs text-gray-500 mb-3">Permanently delete this card from WooCommerce. This does not remove any existing eBay listings.</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-900/40 hover:bg-red-800/60 text-red-400 font-semibold rounded-xl px-4 py-2 text-sm border border-red-900 transition-colors"
        >
          {deleting ? 'Deleting…' : 'Delete Card'}
        </button>
      </div>
    </div>
  );
}
