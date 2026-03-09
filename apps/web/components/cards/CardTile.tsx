import type { KayouCard } from '@/types';
import Link from 'next/link';
import Image from 'next/image';

const RARITY_COLORS: Record<string, string> = {
  R: 'bg-slate-500 text-white',
  SR: 'bg-blue-600 text-white',
  SSR: 'bg-purple-600 text-white',
  TR: 'bg-amber-500 text-white',
  TGR: 'bg-amber-600 text-white',
  HR: 'bg-rose-600 text-white',
  SP: 'bg-green-600 text-white',
  UR: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
};

const PROPERTY_BADGE: Record<string, string> = {
  'my-little-pony': 'bg-pink-100 text-pink-700',
  naruto: 'bg-orange-100 text-orange-700',
};

interface CardTileProps {
  card: KayouCard;
}

export function CardTile({ card }: CardTileProps) {
  const rarityClass = RARITY_COLORS[card.rarity] ?? 'bg-slate-400 text-white';
  const propertyClass = PROPERTY_BADGE[card.property] ?? 'bg-gray-100 text-gray-700';
  const image = card.images[0];
  const propertyLabel = card.property === 'my-little-pony' ? 'My Little Pony' : 'Naruto';

  return (
    <Link
      href={`/cards/${card.slug}`}
      className="group flex flex-col rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 active:scale-95"
    >
      <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt || card.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 text-sm font-medium">
            No Image
          </div>
        )}
        <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${rarityClass}`}>
          {card.rarity}
        </span>
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        <span className={`self-start text-xs font-medium px-2 py-0.5 rounded-full ${propertyClass}`}>
          {propertyLabel}
        </span>
        <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{card.name}</h3>
        <p className="text-xs text-gray-400">{card.set} · #{card.cardNumber}</p>

        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-base font-bold text-gray-900">
            {card.price ? `$${parseFloat(card.price).toFixed(2)}` : 'Price TBD'}
          </span>
          {card.inStock ? (
            <span className="text-xs text-emerald-600 font-medium">In Stock</span>
          ) : (
            <span className="text-xs text-red-400 font-medium">Sold Out</span>
          )}
        </div>
      </div>
    </Link>
  );
}
