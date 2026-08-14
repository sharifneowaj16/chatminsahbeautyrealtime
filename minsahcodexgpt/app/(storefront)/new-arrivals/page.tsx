'use client';

import Link from 'next/link';
import CollectionToolbar from '@/components/layout/CollectionToolbar';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@/utils/currency';
import { productPath } from '@/lib/product-url';
import CartStepper from '@/components/cart/CartStepper';
import CardBuyNowButton from '@/components/cart/CardBuyNowButton';

const categories = ['All', 'Makeup', 'Skincare', 'Hair Care', 'Fragrance'];

const products = [
  { id: '1', name: 'Blush Stick', brand: 'Makeup by Mario', price: 32, image: '💄', stock: 0 },
  { id: '2', name: 'Eye Liner', brand: 'Inglot', price: 15, image: '✏️', stock: 0 },
  { id: '3', name: 'Concealer', brand: 'Elf Cosmetics', price: 45, image: '🧴', stock: 0 },
  { id: '4', name: 'Blush', brand: 'Rare Beauty', price: 40, image: '💗', stock: 0 },
  { id: '5', name: 'Hair Mask', brand: 'Gisou', price: 55, image: '🧴', stock: 0 },
  { id: '6', name: 'Eye Liner', brand: 'Inglot', price: 13, image: '✏️', stock: 0 },
];

export default function NewArrivalsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-minsah-light">
      <CollectionToolbar
        title="New Arrivals"
        subtitle="Explore the newest products added to Minsah Beauty."
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
                <div
                  className="absolute bottom-2.5 right-2.5 z-10"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <CartStepper
                    productId={product.id}
                    productName={product.name}
                    productImage={product.image}
                    price={product.price}
                    maxStock={product.stock}
                    circleAdd={true}
                    disabled={product.stock === 0}
                  />
                </div>
              </div>

              {/* Product Info */}
              <Link href={productPath(product)}>
                <h3 className="font-semibold text-sm text-minsah-dark mb-1">{product.name}</h3>
                <p className="text-xs text-minsah-secondary mb-2">{product.brand}</p>

                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-minsah-primary">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </Link>

              <div
                className="mt-3"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <CardBuyNowButton
                  productId={product.id}
                  productName={product.name}
                  productImage={product.image}
                  price={product.price}
                  maxStock={product.stock}
                  disabled={product.stock === 0}
                />
              </div>

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
