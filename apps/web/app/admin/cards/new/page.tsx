import type { Metadata } from 'next';
import { AddCardForm } from '@/components/admin/AddCardForm';

export const metadata: Metadata = { title: 'Add Card' };

export default function NewCardPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black">Add New Card</h1>
        <p className="text-gray-400 text-sm mt-1">Add a Kayou card to your inventory</p>
      </div>
      <AddCardForm />
    </div>
  );
}
