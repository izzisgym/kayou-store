import { Header } from '@/components/ui/Header';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
