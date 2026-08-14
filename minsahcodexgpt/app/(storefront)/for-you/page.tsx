'use client';

import Link from 'next/link';
import CollectionToolbar from '@/components/layout/CollectionToolbar';
import { useState } from 'react';
import { Heart, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/utils/currency';
import { productPath } from '@/lib/product-url';

const categories = ['All', 'Makeup', 'Skincare', 'Hair Care', 'Fragrance'];

const products = [
  { id: '1', name: 'Foundation', brand: 'Estée Lauder', price: 52, image: '🎨', stock: 0 },
  { id: '2', name: 'Concealer', brand: 'NARS', price: 30, image: '✨', stock: 0 },
  { id: '3', name: 'Eyebrow Pencil', brand: 'Benefit', price: 24, image: '✏️', stock: 0 },
  { id: '4', name: 'Highlighter', brand: 'Becca', price: 38, image: '💎', stock: 0 },
  { id: '5', name: 'Shampoo', brand: 'Olaplex', price: 28, image: '🧴', stock: 0 },
  { id: '6', name: 'Conditioner', brand: 'Olaplex', price: 28, image: '🧴', stock: 0 },
];

export default function ForYouPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getQuantity = (productId: string) => quantities[productId] || 0;

  const incrementQuantity = (productId: string) => {
    setQuantities(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const decrementQuantity = (productId: string) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) - 1)
    }));
  };

  return (
    <div className="min-h-screen bg-minsah-light">
      <CollectionToolbar
        title="Picked For You"
        subtitle="Curated just for you based on your preferences."
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Products Grid */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm relative">
              {/* Product Image */}
              <div className="relative mb-3">
                <Link href={productPath(product)} className="block">
                  <div className="w-full aspect-square bg-minsah-accent rounded-xl flex items-center justify-center text-5xl mb-2">
                    {product.image}
                  </div>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 bg-white shadow-md hover:bg-red-50"
                  aria-label={`Add ${product.name} to favourites`}
                >
                  <Heart size={16} className="text-minsah-secondary" aria-hidden="true" />
                </Button>
              </div>

              {/* Product Info */}
              <Link href={productPath(product)}>
                <h3 className="font-semibold text-sm text-minsah-dark mb-1">{product.name}</h3>
                <p className="text-xs text-minsah-secondary mb-2">{product.brand}</p>

                {/* Price and Quantity */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-minsah-primary">
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        decrementQuantity(product.id);
                      }}
                      className="border-minsah-secondary/30 hover:bg-minsah-accent"
                      aria-label={`Decrease quantity for ${product.name}`}
                    >
                      <Minus size={12} className="text-minsah-dark" aria-hidden="true" />
                    </Button>
                    <span className="text-sm font-semibold text-minsah-dark min-w-[20px] text-center">
                      {getQuantity(product.id)}
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        incrementQuantity(product.id);
                      }}
                      aria-label={`Increase quantity for ${product.name}`}
                    >
                      <Plus size={12} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </Link>

              {/* Stock Status */}
              <div className="mt-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                <span className="text-xs text-minsah-secondary">{product.stock}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
