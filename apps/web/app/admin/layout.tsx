import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminSignOut } from '@/components/admin/AdminSignOut';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-extrabold text-white tracking-tight">
              Kayou <span className="text-indigo-400">Admin</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/admin/cards/new" className="text-gray-400 hover:text-white transition-colors">
                Add Card
              </Link>
              <Link href="/admin/settings" className="text-gray-400 hover:text-white transition-colors">
                Settings
              </Link>
              <Link href="/" target="_blank" className="text-gray-400 hover:text-white transition-colors text-xs">
                View Store ↗
              </Link>
            </nav>
          </div>
          <AdminSignOut />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
