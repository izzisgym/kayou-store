import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-extrabold text-lg tracking-tight text-gray-900">Kayou</span>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Cards</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/browse/my-little-pony" className="text-pink-600 hover:text-pink-700 transition-colors">
            My Little Pony
          </Link>
          <Link href="/browse/naruto" className="text-orange-500 hover:text-orange-600 transition-colors">
            Naruto
          </Link>
        </nav>
      </div>
    </header>
  );
}
