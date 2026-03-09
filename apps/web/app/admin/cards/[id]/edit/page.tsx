import { notFound } from 'next/navigation';
import { getCardById } from '@/lib/woocommerce';
import { EditCardForm } from '@/components/admin/EditCardForm';
import type { Metadata } from 'next';

interface EditCardPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditCardPageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getCardById(parseInt(id, 10));
  return { title: card ? `Edit: ${card.name}` : 'Edit Card' };
}

export default async function EditCardPage({ params }: EditCardPageProps) {
  const { id } = await params;
  const card = await getCardById(parseInt(id, 10));
  if (!card) notFound();

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black">Edit Card</h1>
        <p className="text-gray-400 text-sm mt-1 line-clamp-1">{card.name}</p>
      </div>
      <EditCardForm card={card} />
    </div>
  );
}
