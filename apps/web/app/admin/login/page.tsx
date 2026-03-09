'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', {
      password,
      callbackUrl,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError('Invalid password. Try again.');
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight">Kayou Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to manage your card inventory</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4 border border-gray-800">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && (
            <p className="text-red-400 text-xs bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
