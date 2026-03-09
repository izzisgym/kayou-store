export type Rarity = 'R' | 'SR' | 'SSR' | 'TR' | 'TGR' | 'HR' | 'SP' | 'UR';
export type Property = 'my-little-pony' | 'naruto';

export interface KayouCard {
  id: number;
  name: string;
  slug: string;
  sku: string;
  property: Property;
  set: string;
  cardNumber: string;
  rarity: Rarity;
  price: string;
  stockQuantity: number;
  inStock: boolean;
  description: string;
  images: CardImage[];
  ebayListingId?: string;
  ebayListingUrl?: string;
  ebayAutoAcceptPrice?: string;
  ebayAutoDeclinePrice?: string;
}

export interface CardImage {
  id: number;
  src: string;
  alt: string;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  status: string;
  description: string;
  regular_price: string;
  stock_quantity: number;
  manage_stock: boolean;
  in_stock: boolean;
  images: { id: number; src: string; alt: string }[];
  categories: { id: number; name: string; slug: string }[];
  attributes: {
    id: number;
    name: string;
    slug: string;
    options: string[];
  }[];
  meta_data: { key: string; value: string }[];
}

export interface CreateCardInput {
  name: string;
  property: Property;
  set: string;
  cardNumber: string;
  rarity: Rarity;
  price: string;
  stockQuantity: number;
  description?: string;
  imageUrl?: string;
}

export interface UpdateCardInput {
  price?: string;
  stockQuantity?: number;
  ebayAutoAcceptPrice?: string;
  ebayAutoDeclinePrice?: string;
}

export interface EbaySyncResult {
  success: boolean;
  listingId?: string;
  listingUrl?: string;
  error?: string;
}

export interface PaginationMeta {
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}
