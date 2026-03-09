'use client';

import { signOut } from 'next-auth/react';

export function AdminSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/admin/login' })}
      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
    >
      Sign out
    </button>
  );
}
