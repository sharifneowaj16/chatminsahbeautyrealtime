'use client';

import Link from 'next/link';
import CollectionToolbar from '@/components/layout/CollectionToolbar';
import { useState } from 'react';
import { Heart, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPrice, convertUSDtoBDT } from '@/utils/currency';
import { productPath } from '@/lib/product-url';

const categories = ['All', 'Makeup', 'Skincare', 'Hair Care', 'Fragrance'];

const products = [
  { id: '1', name: 'Foundation', brand: 'Mac Studio', price: 47, image: '🧴', stock: 1 },
  { id: '2', name: 'Mascara', brand: 'Maybelline', price: 10, image: '🖌️', stock: 1 },
  { id: '3', name: 'Highlighter', brand: 'Charlotte Tilbury', price: 55, image: '✨', stock: 1 },
  { id: '4', name: 'Lipstick', brand: 'YSL', price: 35, image: '💄', stock: 1 },
  { id: '5', name: 'Blush Brush', brand: 'Bobbi Brown', price: 28, image: '🖌️', stock: 1 },
  { id: '6', name: 'Highlighter Stick', brand: 'Fenty Beauty', price: 32, image: '✨', stock: 1 },
];

export default function RecommendationsPage() {
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
        title="Recommended Deals"
        subtitle="Beauty picks selected to make discovery faster."
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
            <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm">
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
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-minsah-primary">
                    {formatPrice(convertUSDtoBDT(product.price))}
                  </span>

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
