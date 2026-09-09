'use client';





import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { adminFetchJson } from '@/lib/adminFetch';
import {
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  Eye,
  Star,
  Layers,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatPrice } from '@/utils/currency';

interface ApiProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  categoryId: string;
  categorySlug: string;
  brand: string;
  brandId: string;
  brandSlug: string;
  subcategory: string;
  price: number;
  originalPrice: number | null;
  compareAtPrice: number | null;
  salePrice: number | null;
  costPrice: number | null;
  discountPercentage: number | null;
  stock: number;
  quantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  status: 'active' | 'inactive' | 'out_of_stock';
  image: string;
  images: Array<{
    url: string;
    alt: string;
    title: string;
    sortOrder: number;
    isDefault: boolean;
  }>;
  rating: number;
  reviews: number;
  reviewCount: number;
  averageRating: number;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
  isFeatured: boolean;
  isNew: boolean;
  codAvailable: boolean;
  returnEligible: boolean;
  preOrderOption: boolean;
  barcode: string;
  condition: string;
  gtin: string;
  flashSaleEligible: boolean;
  offerStartDate: string | null;
  offerEndDate: string | null;
  originCountry: string;
  shippingWeight: string;
  isFragile: boolean;
  deliveryOfferEnabled: boolean;
  deliveryOfferType: 'DEFAULT' | 'FREE' | 'FIXED' | string;
  deliveryOfferAmount: number | null;
  deliveryOfferStartDate: string | null;
  deliveryOfferEndDate: string | null;
  deliveryOfferBadgeText: string;
  relatedProducts: string;
  variants: Array<{
    id: string;
    sku: string;
    price: number;
    stock: number;
    quantity: number;
    attributes: unknown;
    image: string;
  }>;
  hasPendingShortlist?: boolean; // ← CHANGE 1: new field
}

interface ProductFilters {
  search: string;
  category: string;
  status: string;
  sortBy: string;
}

interface ProductPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface AdminProductsResponse {
  products: ApiProduct[];
  pagination: ProductPagination;
}

const categories = [
  'All Categories',
  'Make Up',
  'SPA',
  'Perfume',
  'Nails',
  'Skin care',
  'Hair care',
  'Combo',
];

const sortOptions = [
  { value: 'name',       label: 'Name' },
  { value: 'price_low',  label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'stock',      label: 'Stock Level' },
  { value: 'created',    label: 'Date Created' },
  { value: 'rating',     label: 'Rating' },
];

export default function ProductsPage() {
  const { pushToast, requestConfirmation } = useToast();
  const { hasPermission } = useAdminAuth();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({
    search:   '',
    category: 'All Categories',
    status:   '',
    sortBy:   'created',
  });
  const [pagination, setPagination] = useState<ProductPagination>({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 1,
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        sortBy: filters.sortBy,
      });
      if (filters.category && filters.category !== 'All Categories') {
        params.set('category', filters.category);
      }
      if (filters.search) {
        params.set('search', filters.search);
      }
      if (filters.status) {
        params.set('status', filters.status);
      }

      const data = await adminFetchJson<AdminProductsResponse>(`/api/admin/products?${params.toString()}`);
      setProducts(data.products || []);
      setPagination((prev) => ({
        ...prev,
        page: data.pagination?.page || prev.page,
        limit: data.pagination?.limit || prev.limit,
        totalCount: data.pagination?.totalCount || 0,
        totalPages: data.pagination?.totalPages || 1,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      console.error('Error fetching products:', message);
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, [filters.category, filters.search, filters.sortBy, filters.status, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const deleteProductById = async (productId: string) => {
    await adminFetchJson<{ success: boolean; archived?: boolean }>(`/api/admin/products/${productId}`, {
      method: 'DELETE',
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProductById(productId);
      await fetchProducts();
      setSelectedProducts((prev) => prev.filter((id) => id !== productId));
    } catch (err) {
      console.error('Error deleting product:', err);
      pushToast({ tone: 'danger', description: err instanceof Error ? err.message : 'Failed to delete product' });
    }
  };

  if (!hasPermission(PERMISSIONS.PRODUCTS_VIEW)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don&apos;t have permission to view products.</p>
      </div>
    );
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? products.map((p) => p.id) : []);
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProducts(checked
      ? [...selectedProducts, productId]
      : selectedProducts.filter((id) => id !== productId)
    );
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!(await requestConfirmation({ title: 'Delete selected products?', description: `This will delete ${selectedProducts.length} product(s).`, confirmLabel: 'Delete products', tone: 'danger' }))) return;
    try {
      for (const productId of selectedProducts) {
        await deleteProductById(productId);
      }
      setSelectedProducts([]);
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting products:', err);
      pushToast({ tone: 'danger', description: err instanceof Error ? err.message : 'Failed to delete selected products' });
    }
  };

  const updateFilter = (key: keyof ProductFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedProducts([]);
  };

  const firstVisibleProduct = pagination.totalCount === 0
    ? 0
    : (pagination.page - 1) * pagination.limit + 1;
  const lastVisibleProduct = Math.min(pagination.page * pagination.limit, pagination.totalCount);

  const getStatusColor = (status: ApiProduct['status']) => {
    switch (status) {
      case 'active':       return 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40';
      case 'inactive':     return 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50';
      case 'out_of_stock': return 'bg-rose-950/70 text-rose-400 border border-rose-800/40';
      default:             return 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50';
    }
  };

  const getStockColor = (stock: number) => {
    if (stock === 0)  return 'text-rose-400';
    if (stock < 20)   return 'text-amber-400';
    return 'text-emerald-400';
  };

  const productUrlKey = (product: ApiProduct) => product.slug || product.id;
  const hasDeliveryOffer = (product: ApiProduct) => product.deliveryOfferEnabled && product.deliveryOfferType !== 'DEFAULT';
  const getDeliveryOfferLabel = (product: ApiProduct) => {
    if (product.deliveryOfferType === 'FREE') return product.deliveryOfferBadgeText || 'Free Delivery';
    if (product.deliveryOfferType === 'FIXED') return product.deliveryOfferBadgeText || `Fixed Delivery ${formatPrice(product.deliveryOfferAmount || 0)}`;
    return '';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F3F0]">Products</h1>
          <p className="text-sm text-[#9A9691] mt-1">Manage your product inventory</p>
        </div>
        {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
          <div className="mt-4 sm:mt-0 flex gap-3">
            <Link
              href="/admin/products/import"
              className="inline-flex items-center px-4 py-2 bg-[#1E1E24] border border-[#D07A60] text-[#D07A60] rounded-lg hover:bg-[#26262E] transition-colors duration-200"
            >
              <ClipboardPaste className="w-5 h-5 mr-2" />
              Claude Import
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center px-4 py-2 bg-admin-primary text-white rounded-lg hover:bg-admin-primary-hover transition-colors duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Product
            </Link>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-[#1E1E24] rounded-lg border border-[#2A2A32] p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B6864]" />
              <Input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#14141A] border border-[#2A2A32] text-[#F5F3F0] placeholder-[#6B6864] rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
              />
            </div>
          </div>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] rounded-lg hover:bg-[#26262E] transition-colors duration-200"
          >
            <Filter className="w-5 h-5 mr-2 text-[#9A9691]" />
            Filters
            {showFilters && <Layers className="w-4 h-4 ml-2 text-admin-primary" />}
          </Button>

          <Select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="px-4 py-2 border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#9A9691] mb-1">Category</label>
              <Select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full px-3 py-2 border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] rounded-lg focus:ring-2 focus:ring-admin-primary"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9A9691] mb-1">Status</label>
              <Select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] rounded-lg focus:ring-2 focus:ring-admin-primary"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="out_of_stock">Out of Stock</option>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-blue-950/40 border border-blue-800/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-200">
              {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-3">
              <Button onClick={() => setSelectedProducts([])} className="text-blue-400 hover:text-blue-300">
                Clear selection
              </Button>
              {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
                <Button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {fetchError && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-200">
                <span className="font-medium">Failed to load products:</span> {fetchError}
              </p>
            </div>
            <Button
              onClick={() => fetchProducts()}
              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-[#1E1E24] rounded-lg border border-[#2A2A32] overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#9A9691]">Loading products...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#14141A] border-b border-[#2A2A32]">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <Input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-[#3E3E48] bg-[#14141A] text-admin-primary focus:ring-admin-primary"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9A9691] uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9A9691] uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9A9691] uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9A9691] uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9A9691] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9A9691] uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9A9691] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[#1E1E24] divide-y divide-[#2A2A32]">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-[#26262E]/70 transition-colors">
                    <td className="px-6 py-4">
                      <Input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                        className="rounded border-[#3E3E48] bg-[#14141A] text-admin-primary focus:ring-admin-primary"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#26262E] rounded-lg flex items-center justify-center overflow-hidden">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#F5F3F0]">
                            {product.name}
                            {product.featured && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/40">
                                <Star className="w-3 h-3 mr-1" />
                                Featured
                              </span>
                            )}
                            {product.isNew && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                                New
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#9A9691] font-mono">SKU: {product.sku}</div>
                          <div className="text-xs text-[#6B6864] font-mono">{product.slug || product.id}</div>
                          {hasDeliveryOffer(product) && (
                            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-emerald-950/70 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-800/40">
                              {getDeliveryOfferLabel(product)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#F5F3F0]">{product.category}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <span className="font-medium text-[#F5F3F0]">{formatPrice(product.price)}</span>
                        {product.originalPrice != null && product.originalPrice > product.price && (
                          <span className="ml-2 text-xs text-[#6B6864] line-through">{formatPrice(product.originalPrice)}</span>
                        )}
                      </div>
                      {product.originalPrice != null && product.originalPrice > product.price && (
                        <div className="text-xs text-emerald-400">
                          {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={clsx('text-sm font-medium', getStockColor(product.stock))}>
                        {product.stock} units
                      </div>
                      {product.variants.length > 0 && (
                        <div className="text-xs text-[#9A9691]">{product.variants.length} variant{product.variants.length === 1 ? '' : 's'}</div>
                      )}
                    </td>

                    {/* ── CHANGE 2: Status column with hasPendingShortlist badge ── */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit', getStatusColor(product.status))}>
                          {product.status.replace('_', ' ')}
                        </span>
                        {product.hasPendingShortlist && (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-800/40 w-fit"
                            title="This product is unlisted but has pending orders in shortlist"
                          >
                            ⚠️ Unlisted - Pending Orders
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-[#F5F3F0]">{product.rating}</span>
                        <span className="text-xs text-[#9A9691]">({product.reviews})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/products/${productUrlKey(product)}`}
                          className="text-admin-primary hover:text-admin-primary-hover p-1 rounded hover:bg-[#26262E] transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {hasPermission(PERMISSIONS.PRODUCTS_EDIT) && (
                          <Link
                            href={`/admin/products/${productUrlKey(product)}/edit`}
                            className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-[#26262E] transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
                          <Button
                            onClick={async () => {
                              const confirmed = await requestConfirmation({ title: 'Delete this product?', description: `${product.name} will be permanently deleted.`, confirmLabel: 'Delete product', tone: 'danger' });
                              if (confirmed) {
                                await handleDeleteProduct(product.id);
                              }
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#6B6864]">No products found matching your criteria.</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#2A2A32] bg-[#14141A]/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#9A9691]">
              Showing {firstVisibleProduct}-{lastVisibleProduct} of {pagination.totalCount} products
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={pagination.limit}
                onChange={(event) => {
                  setPagination((prev) => ({
                    ...prev,
                    page: 1,
                    limit: Number(event.target.value),
                  }));
                  setSelectedProducts([]);
                }}
                className="rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 text-sm focus:ring-2 focus:ring-admin-primary"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </Select>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  className="inline-flex items-center rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#26262E]"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-[#9A9691]">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  className="inline-flex items-center rounded-lg border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#26262E]"
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
