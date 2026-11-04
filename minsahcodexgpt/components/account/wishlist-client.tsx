'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/utils/currency';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useCartDrawer } from '@/contexts/CartDrawerContext';
import { productPath } from '@/lib/product-url';
import {
  Heart,
  ShoppingBag,
  X,
  Star,
  Search,
  Package,
  Trash2,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface WishlistItem {
  id: string;
  productId: string;
  productSlug?: string | null;
  productName: string;
  productImage: string | null;
  price: number;
  originalPrice: number | null;
  inStock: boolean;
  addedAt: string | Date;
  category: string;
  rating: number;
  reviewCount: number;
  discount?: number;
  restockDate?: string | Date;
}

interface WishlistClientProps {
  initialItems: WishlistItem[];
}

export function WishlistClient({ initialItems }: WishlistClientProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { registerAddIntent, openForSuccessfulAdd } = useCartDrawer();
  const [wishlistItems, setWishlistItems] = useState(initialItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [addingToCartIds, setAddingToCartIds] = useState<string[]>([]);
  const [addedToCartIds, setAddedToCartIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toDateValue = (value: string | Date) => new Date(value);

  const categories = useMemo(
    () => [
      'all',
      ...Array.from(new Set(wishlistItems.map((item) => item.category))),
    ],
    [wishlistItems]
  );

  const filteredItems = useMemo(() => {
    let filtered = [...wishlistItems];
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (normalizedSearchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.productName.toLowerCase().includes(normalizedSearchTerm) ||
          item.category.toLowerCase().includes(normalizedSearchTerm)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    switch (sortBy) {
      case 'dateAdded':
        filtered.sort(
          (a, b) =>
            toDateValue(b.addedAt).getTime() - toDateValue(a.addedAt).getTime()
        );
        break;
      case 'priceLow':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'priceHigh':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        filtered.sort((a, b) => a.productName.localeCompare(b.productName));
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    return filtered;
  }, [wishlistItems, searchTerm, categoryFilter, sortBy]);

  const handleRemoveItem = async (itemId: string) => {
    setErrorMessage('');
    setRemovingIds((prev) => [...prev, itemId]);

    try {
      const response = await fetch(`/api/wishlist/${itemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      setWishlistItems((prev) => prev.filter((item) => item.id !== itemId));
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
      router.refresh();
    } catch {
      setErrorMessage('Failed to remove wishlist item. Please try again.');
    } finally {
      setRemovingIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedItems.length === 0) return;

    setErrorMessage('');
    setRemovingIds((prev) => [...new Set([...prev, ...selectedItems])]);

    try {
      const responses = await Promise.all(
        selectedItems.map((itemId) =>
          fetch(`/api/wishlist/${itemId}`, { method: 'DELETE' })
        )
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error('Failed to remove selected items');
      }

      setWishlistItems((prev) =>
        prev.filter((item) => !selectedItems.includes(item.id))
      );
      setSelectedItems([]);
      router.refresh();
    } catch {
      setErrorMessage('Failed to remove selected wishlist items. Please try again.');
    } finally {
      setRemovingIds([]);
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    if (!item.inStock || addingToCartIds.includes(item.id)) {
      return;
    }

    setErrorMessage('');
    setAddingToCartIds((prev) => [...prev, item.id]);

    try {
      const drawerIntentId = registerAddIntent();
      const cartItem: CartItem = {
        id: item.productId,
        productId: item.productId,
        name: item.productName,
        price: item.price,
        quantity: 1,
        image: typeof item.productImage === 'string' ? item.productImage : '',
      };
      const success = await addItem(cartItem);
      if (!success) throw new Error('Failed to add wishlist item to cart');
      openForSuccessfulAdd(drawerIntentId, cartItem, 1);

      setAddedToCartIds((prev) => [...prev, item.id]);
      setTimeout(() => {
        setAddedToCartIds((prev) => prev.filter((id) => id !== item.id));
      }, 1800);
    } catch {
      setErrorMessage('Failed to add item to cart. Please try again.');
    } finally {
      setAddingToCartIds((prev) => prev.filter((id) => id !== item.id));
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map((item) => item.id));
    }
  };

  function ProductImage({ src, name }: { src: string | null; name: string }) {
    if (
      src &&
      (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:'))
    ) {
      return (
        <Image
          src={src}
          alt={name ? `${name} product image` : 'Wishlist product image'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain p-3"
        />
      );
    }

    return (
      <Package className="h-10 w-10 text-[#62666d]" aria-hidden="true" />
    );
  }

  return (
    <div className="w-full space-y-6 overflow-x-hidden">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-[#5e6ad2]/15 text-[#828fff] border border-[#5e6ad2]/30">
              <Heart className="w-3 h-3 text-[#828fff] fill-current" />
              Saved Beauty
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f7f8f8]">
            My Wishlist
          </h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'luxury item' : 'luxury items'} saved for later
          </p>
        </div>

        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8a8f98] font-mono">
              {selectedItems.length} Selected
            </span>
            <button
              type="button"
              onClick={handleRemoveSelected}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Selected</span>
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* ── Search, Filters & Controls ────────────────────────────────────────── */}
      <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8a8f98] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search saved cosmetics & skincare..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-[#141516] border border-[#23252a] rounded-xl text-xs sm:text-sm text-[#f7f8f8] placeholder-[#62666d] focus:outline-none focus:border-[#5e6ad2] transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <div className="w-1/2 sm:w-44">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-11 px-3 bg-[#141516] border border-[#23252a] rounded-xl text-xs sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="w-1/2 sm:w-44">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-11 px-3 bg-[#141516] border border-[#23252a] rounded-xl text-xs sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2] transition-colors cursor-pointer"
            >
              <option value="dateAdded">Recently Saved</option>
              <option value="name">Product Name</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Wishlist Grid ─────────────────────────────────────────────────────── */}
      {filteredItems.length === 0 ? (
        <div className="bg-[#0f1011] rounded-2xl border border-dashed border-[#23252a] p-10 text-center shadow-xl">
          <Heart className="w-12 h-12 text-[#62666d] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#f7f8f8] mb-1">
            {searchTerm || categoryFilter !== 'all'
              ? 'No matching wishlist items'
              : 'Your luxury wishlist is empty'}
          </h3>
          <p className="text-xs text-[#8a8f98] mb-4">
            {searchTerm || categoryFilter !== 'all'
              ? 'Try modifying your search or filter options'
              : 'Save products you love to keep track of exclusive restocks and VIP promotions'}
          </p>
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 bg-[#5e6ad2] hover:bg-[#828fff] text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95"
          >
            Explore Beauty Shop
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.length > 1 && (
            <div className="flex items-center justify-between px-2 text-xs text-[#8a8f98]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredItems.length}
                  onChange={handleSelectAll}
                  className="accent-[#5e6ad2] rounded w-4 h-4 cursor-pointer"
                />
                <span>Select All ({filteredItems.length})</span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl bg-[#0f1011] border border-[#23252a] overflow-hidden shadow-xl hover:border-[#5e6ad2]/50 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative aspect-square w-full bg-[#141516] flex items-center justify-center overflow-hidden border-b border-[#23252a]">
                    <ProductImage src={item.productImage} name={item.productName} />

                    {/* Top Right Actions */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                          selectedItems.includes(item.id)
                            ? 'bg-[#5e6ad2] border-[#5e6ad2] text-white'
                            : 'bg-[#0f1011]/80 backdrop-blur-md border-[#23252a] text-[#8a8f98]'
                        }`}
                        aria-label={`Select ${item.productName}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removingIds.includes(item.id)}
                        className="w-7 h-7 rounded-lg bg-[#0f1011]/80 backdrop-blur-md border border-[#23252a] flex items-center justify-center text-[#8a8f98] hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
                        aria-label={`Remove ${item.productName} from wishlist`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Discount Badge */}
                    {item.discount && (
                      <span className="absolute top-2.5 left-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono">
                        -{item.discount}% OFF
                      </span>
                    )}

                    {/* Out of Stock Overlay */}
                    {!item.inStock && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 text-center">
                        <span className="px-3 py-1 rounded-lg bg-[#18191a] border border-[#23252a] text-xs font-semibold text-[#8a8f98]">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#828fff] mb-1">
                      {item.category}
                    </p>
                    <Link
                      href={productPath({ id: item.productId, slug: item.productSlug })}
                      className="font-medium text-xs sm:text-sm text-[#f7f8f8] hover:text-[#828fff] line-clamp-2 transition-colors"
                    >
                      {item.productName}
                    </Link>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-[#f7f8f8] font-mono">{item.rating || 4.9}</span>
                      <span className="text-[#8a8f98] text-[11px]">({item.reviewCount || 12})</span>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 mt-2.5">
                      <span className="text-base font-bold text-[#f7f8f8] font-mono">
                        {formatPrice(item.price)}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-xs text-[#8a8f98] line-through font-mono">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons (Uniform Sizing) */}
                <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(item)}
                    disabled={!item.inStock || addingToCartIds.includes(item.id)}
                    className={`w-full h-11 sm:h-9 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer ${
                      !item.inStock
                        ? 'bg-[#18191a] text-[#62666d] border border-[#23252a] cursor-not-allowed'
                        : addingToCartIds.includes(item.id)
                        ? 'bg-[#5e6ad2]/50 text-white'
                        : addedToCartIds.includes(item.id)
                        ? 'bg-[#27a644]/20 border border-[#27a644]/40 text-[#27a644]'
                        : 'bg-[#5e6ad2] hover:bg-[#828fff] text-white shadow-md'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>
                      {!item.inStock
                        ? 'Out of Stock'
                        : addingToCartIds.includes(item.id)
                        ? 'Adding...'
                        : addedToCartIds.includes(item.id)
                        ? 'Added to Cart'
                        : 'Add to Cart'}
                    </span>
                  </button>

                  <Link
                    href={productPath({ id: item.productId, slug: item.productSlug })}
                    className="w-full h-11 sm:h-9 inline-flex items-center justify-center rounded-xl border border-[#23252a] bg-[#141516] hover:bg-[#18191a] text-[#8a8f98] hover:text-[#f7f8f8] text-xs font-medium transition-all"
                  >
                    <span>View Product</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
