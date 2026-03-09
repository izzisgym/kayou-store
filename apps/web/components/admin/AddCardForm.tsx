'use client';

import type { CreateCardInput, Property, Rarity } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const RARITIES: Rarity[] = ['R', 'SR', 'SSR', 'TR', 'TGR', 'HR', 'SP', 'UR'];

const MLP_SETS = [
  'YH-F01', 'YH-F02', 'YH-F03', 'YH-F04', 'YH-F05',
  'YH-F06', 'YH-F07', 'YH-F08', 'YH-F09', 'YH-F10',
];

const NARUTO_SETS = [
  'NT-001', 'NT-002', 'NT-003', 'NT-004', 'NT-005',
  'NT-006', 'NT-007', 'NT-008', 'NT-009', 'NT-010',
];

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

function Field({ label, required, children, hint }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function AddCardForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Partial<CreateCardInput>>({
    property: 'my-little-pony',
    rarity: 'R',
    stockQuantity: 1,
    price: '',
  });

  const sets = form.property === 'my-little-pony' ? MLP_SETS : NARUTO_SETS;

  function update(key: keyof CreateCardInput, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create card');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-5">
      <Field label="Property" required>
        <div className="flex gap-2">
          {(['my-little-pony', 'naruto'] as Property[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { update('property', p); update('set', ''); }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border transition-colors ${
                form.property === p
                  ? p === 'my-little-pony'
                    ? 'bg-pink-600 text-white border-pink-600'
                    : 'bg-orange-500 text-white border-orange-500'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
              }`}
            >
              {p === 'my-little-pony' ? 'My Little Pony' : 'Naruto'}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Card Name" required>
        <input
          className={inputClass}
          placeholder="e.g. Twilight Sparkle"
          value={form.name ?? ''}
          onChange={(e) => update('name', e.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Set" required>
          <select
            className={inputClass}
            value={form.set ?? ''}
            onChange={(e) => update('set', e.target.value)}
            required
          >
            <option value="">Select set…</option>
            {sets.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </Field>

        <Field label="Card Number" required hint="e.g. 001, 045">
          <input
            className={inputClass}
            placeholder="045"
            value={form.cardNumber ?? ''}
            onChange={(e) => update('cardNumber', e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="Rarity" required>
        <div className="flex flex-wrap gap-2">
          {RARITIES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => update('rarity', r)}
              className={`rounded-full px-3 py-1 text-xs font-bold border transition-colors ${
                form.rarity === r
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price (USD)">
          <input
            className={inputClass}
            type="number"
            step="0.01"
            min="0"
            placeholder="9.99"
            value={form.price ?? ''}
            onChange={(e) => update('price', e.target.value)}
          />
        </Field>

        <Field label="Quantity">
          <input
            className={inputClass}
            type="number"
            min="0"
            step="1"
            placeholder="1"
            value={form.stockQuantity ?? 1}
            onChange={(e) => update('stockQuantity', parseInt(e.target.value, 10))}
          />
        </Field>
      </div>

      <Field label="Image URL" hint="Paste a direct image URL for the card front">
        <input
          className={inputClass}
          type="url"
          placeholder="https://…"
          value={form.imageUrl ?? ''}
          onChange={(e) => update('imageUrl', e.target.value)}
        />
      </Field>

      <Field label="Description">
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          placeholder="Optional card description…"
          value={form.description ?? ''}
          onChange={(e) => update('description', e.target.value)}
        />
      </Field>

      {error && (
        <p className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          {saving ? 'Adding Card…' : 'Add Card'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl px-4 py-2.5 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
