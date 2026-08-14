"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/utils/currency";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useCartDrawer } from "@/contexts/CartDrawerContext";
import { productPath } from "@/lib/product-url";
import { Heart, ShoppingBag, X, Star, Search, Package } from "lucide-react";
import { Heart as HeartSolid } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("dateAdded");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [addingToCartIds, setAddingToCartIds] = useState<string[]>([]);
  const [addedToCartIds, setAddedToCartIds] = useState<string[]>([]);

  const toDateValue = (value: string | Date) => new Date(value);

  const categories = useMemo(
    () => [
      "all",
      ...Array.from(new Set(wishlistItems.map((item) => item.category))),
    ],
    [wishlistItems],
  );

  const filteredItems = useMemo(() => {
    let filtered = [...wishlistItems];
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (normalizedSearchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.productName.toLowerCase().includes(normalizedSearchTerm) ||
          item.category.toLowerCase().includes(normalizedSearchTerm),
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    switch (sortBy) {
      case "dateAdded":
        filtered.sort(
          (a, b) =>
            toDateValue(b.addedAt).getTime() - toDateValue(a.addedAt).getTime(),
        );
        break;
      case "priceLow":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "priceHigh":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filtered.sort((a, b) => a.productName.localeCompare(b.productName));
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    return filtered;
  }, [wishlistItems, searchTerm, categoryFilter, sortBy]);

  const handleRemoveItem = async (itemId: string) => {
    setErrorMessage("");
    setRemovingIds((prev) => [...prev, itemId]);

    try {
      const response = await fetch(`/api/wishlist/${itemId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to remove item");
      }

      setWishlistItems((prev) => prev.filter((item) => item.id !== itemId));
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
      router.refresh();
    } catch {
      setErrorMessage("Failed to remove wishlist item. Please try again.");
    } finally {
      setRemovingIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedItems.length === 0) return;

    setErrorMessage("");
    setRemovingIds((prev) => [...new Set([...prev, ...selectedItems])]);

    try {
      const responses = await Promise.all(
        selectedItems.map((itemId) =>
          fetch(`/api/wishlist/${itemId}`, { method: "DELETE" }),
        ),
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("Failed to remove selected items");
      }

      setWishlistItems((prev) =>
        prev.filter((item) => !selectedItems.includes(item.id)),
      );
      setSelectedItems([]);
      router.refresh();
    } catch {
      setErrorMessage(
        "Failed to remove selected wishlist items. Please try again.",
      );
    } finally {
      setRemovingIds([]);
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    if (!item.inStock || addingToCartIds.includes(item.id)) {
      return;
    }

    setErrorMessage("");
    setAddingToCartIds((prev) => [...prev, item.id]);

    try {
      const drawerIntentId = registerAddIntent();
      const cartItem: CartItem = {
        id: item.productId,
        productId: item.productId,
        name: item.productName,
        price: item.price,
        quantity: 1,
        image: typeof item.productImage === "string" ? item.productImage : "",
      };
      const success = await addItem(cartItem);
      if (!success) throw new Error("Failed to add wishlist item to cart");
      openForSuccessfulAdd(drawerIntentId, cartItem, 1);

      setAddedToCartIds((prev) => [...prev, item.id]);
      setTimeout(() => {
        setAddedToCartIds((prev) => prev.filter((id) => id !== item.id));
      }, 1800);
    } catch {
      setErrorMessage("Failed to add item to cart. Please try again.");
    } finally {
      setAddingToCartIds((prev) => prev.filter((id) => id !== item.id));
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
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
      (src.startsWith("/") || src.startsWith("http") || src.startsWith("data:"))
    ) {
      return (
        <Image
          src={src}
          alt={name ? `${name} product image` : "Wishlist product image"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain p-4"
        />
      );
    }

    return (
      <Package className="h-12 w-12 text-minsah-secondary" aria-hidden="true" />
    );
  }

  return (
    <div className="min-h-screen bg-minsah-surface">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-minsah-text mb-2">
                My Wishlist
              </h1>
              <p className="text-minsah-muted">
                {wishlistItems.length}{" "}
                {wishlistItems.length === 1 ? "item" : "items"} saved
              </p>
            </div>
            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-minsah-muted">
                  {selectedItems.length} selected
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRemoveSelected}
                  className="rounded-2xl border-red-300 text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  Remove Selected
                </Button>
              </div>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Filters and Controls */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search wishlist items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                label="Search wishlist items"
                hideLabel
                leading={<Search className="w-5 h-5" aria-hidden="true" />}
                className="rounded-2xl focus:ring-minsah-focus"
              />
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Filter by category"
                hideLabel
                className="rounded-2xl focus:ring-minsah-focus"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </option>
                ))}
              </Select>
            </div>

            {/* Sort */}
            <div className="lg:w-48">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort wishlist"
                hideLabel
                className="rounded-2xl focus:ring-minsah-focus"
              >
                <option value="dateAdded">Date Added</option>
                <option value="name">Name</option>
                <option value="priceLow">Price: Low to High</option>
                <option value="priceHigh">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Wishlist Items */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-minsah-text mb-2">
              {searchTerm || categoryFilter !== "all"
                ? "No items found"
                : "Your wishlist is empty"}
            </h3>
            <p className="text-minsah-muted mb-6">
              {searchTerm || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "Start adding items to your wishlist to keep track of products you love"}
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center px-6 py-3 bg-minsah-primary text-white rounded-2xl hover:bg-minsah-dark transition"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All Checkbox */}
            {filteredItems.length > 1 && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <Checkbox
                  checked={selectedItems.length === filteredItems.length}
                  onChange={handleSelectAll}
                  label="Select all items"
                  labelClassName="text-sm font-medium text-minsah-muted"
                />
              </div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Product Image */}
                  <div className="relative">
                    <div className="relative aspect-square bg-gradient-to-br from-minsah-light to-minsah-accent flex items-center justify-center">
                      <ProductImage
                        src={item.productImage}
                        name={item.productName}
                      />
                    </div>

                    {/* Actions Overlay */}
                    <div className="absolute top-2 right-2 flex flex-col space-y-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removingIds.includes(item.id)}
                        className="h-auto min-h-0 w-auto min-w-0 rounded-full bg-white p-2 text-minsah-muted shadow-md hover:shadow-lg"
                        aria-label={`Remove ${item.productName} from wishlist`}
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      <div className="rounded-full bg-white p-2 shadow-md hover:shadow-lg">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          label={<span className="sr-only">Select {item.productName}</span>}
                          containerClassName="w-auto"
                        />
                      </div>
                    </div>

                    {/* Discount Badge */}
                    {item.discount && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        -{item.discount}%
                      </div>
                    )}

                    {/* Out of Stock Overlay */}
                    {!item.inStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white rounded-2xl p-4 text-center">
                          <p className="text-minsah-text font-medium mb-1">
                            Out of Stock
                          </p>
                          {item.restockDate && (
                            <p className="text-sm text-minsah-muted">
                              Expected:{" "}
                              {toDateValue(
                                item.restockDate,
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="mb-2">
                      <span className="text-xs text-minsah-primary font-medium uppercase tracking-wide">
                        {item.category}
                      </span>
                    </div>
                    <h3 className="font-medium text-minsah-text mb-2 line-clamp-2">
                      {item.productName}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(item.rating)
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-minsah-muted ml-2">
                        {item.rating} ({item.reviewCount})
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-lg font-bold text-minsah-text">
                          {formatPrice(item.price)}
                        </span>
                        {item.originalPrice && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            {formatPrice(item.originalPrice)}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-auto min-h-0 w-auto min-w-0 p-2 text-red-500 hover:bg-red-50"
                        aria-label={
                          selectedItems.includes(item.id)
                            ? `${item.productName} is selected`
                            : `Select ${item.productName}`
                        }
                      >
                        {selectedItems.includes(item.id) ? (
                          <HeartSolid className="w-5 h-5 fill-current" aria-hidden="true" />
                        ) : (
                          <Heart className="w-5 h-5" aria-hidden="true" />
                        )}
                      </Button>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleMoveToCart(item)}
                        disabled={
                          !item.inStock || addingToCartIds.includes(item.id)
                        }
                        className={`flex-1 rounded-2xl ${
                          item.inStock && !addingToCartIds.includes(item.id)
                            ? "bg-minsah-primary hover:bg-minsah-dark"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {!item.inStock
                          ? "Out of Stock"
                          : addingToCartIds.includes(item.id)
                            ? "Adding..."
                            : addedToCartIds.includes(item.id)
                              ? "Added!"
                              : "Add to Cart"}
                      </Button>
                      <Link
                        href={productPath({
                          id: item.productId,
                          slug: item.productSlug,
                        })}
                        className="px-4 py-2 border border-gray-300 rounded-2xl text-minsah-muted hover:bg-minsah-surface transition"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
