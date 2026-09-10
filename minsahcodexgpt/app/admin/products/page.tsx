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
        <p className="text-[#8a8f98]">You don&apos;t have permission to view products.</p>
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

  const getStatusColor = (status: ApiProduct['status']) => {    switch (status) {
      case 'active':       return 'bg-white/[0.10] text-white border border-white/[0.15]';
      case 'inactive':     return 'bg-white/[0.04] text-white/50 border border-[#232636]';
      case 'out_of_stock': return 'bg-white/[0.04] text-white/50 border border-[#232636]';
      default:             return 'bg-white/[0.04] text-white/50 border border-[#232636]';
    }
  };

  const getStockColor = (stock: number) => {
    if (stock === 0)  return 'text-white/40 font-normal';
    if (stock < 20)   return 'text-white/80 font-medium';
    return 'text-white font-medium';
  };

  const productUrlKey = (product: ApiProduct) => product.slug || product.id;
  const hasDeliveryOffer = (product: ApiProduct) => product.deliveryOfferEnabled && product.deliveryOfferType !== 'DEFAULT';
  const getDeliveryOfferLabel = (product: ApiProduct) => {
    if (product.deliveryOfferType === 'FREE') return product.deliveryOfferBadgeText || 'Free Delivery';
    if (product.deliveryOfferType === 'FIXED') return product.deliveryOfferBadgeText || `Fixed Delivery ${formatPrice(product.deliveryOfferAmount || 0)}`;
    return '';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.03em] text-[#F7F8F8]">Products</h1>
          <p className="text-xs text-white/50 mt-0.5">Manage and organize your product catalog</p>
        </div>
        {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
          <div className="mt-3 sm:mt-0 flex items-center gap-2">
            <Link
              href="/admin/products/import"
              className="inline-flex items-center h-8.5 px-3 bg-[#161824] border border-[#232636] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-white/80 hover:text-white rounded-lg text-xs font-medium hover:bg-[#1b1e2c] active:scale-[0.97] transition-all duration-120"
            >
              <ClipboardPaste className="w-3.5 h-3.5 mr-1.5 text-white/60" />
              Claude Import
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center h-8.5 px-3.5 bg-[#5e6ad2] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-medium text-xs rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-white/90 active:scale-[0.97] transition-all duration-120"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
              Add Product
            </Link>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="linear-card bg-[#161824] rounded-lg border border-[#232636] p-3 mb-4">
        <div className="flex flex-col lg:flex-row gap-2.5">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full h-8.5 pl-9 pr-3 bg-[#10121b] border border-[#232636] text-[#F7F8F8] placeholder:text-white/35 rounded-lg text-xs focus:ring-1 focus:ring-white/20 focus:border-white/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] transition-all"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              "inline-flex items-center h-8.5 px-3 border rounded-lg text-xs font-medium transition-all duration-120 active:scale-[0.97]",
              showFilters
                ? "bg-[#5e6ad2] text-white border-[#5e6ad2] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                : "bg-[#10121b] border-[#232636] text-white/80 hover:text-white hover:bg-[#1b1e2c]"
            )}
          >
            <Filter className={clsx("w-3.5 h-3.5 mr-1.5", showFilters ? "text-white" : "text-white/50")} />
            Filters
            {showFilters && <Layers className="w-3.5 h-3.5 ml-1.5 text-white" />}
          </button>

          <Select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="h-8.5 px-3 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg text-xs font-medium focus:ring-1 focus:ring-white/20 focus:border-white/25"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-[#232636] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-white/50 mb-1">Category</label>
              <Select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full h-8 px-2.5 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-md text-xs"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-white/50 mb-1">Status</label>
              <Select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full h-8 px-2.5 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-md text-xs"
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
        <div className="linear-card bg-white/[0.04] border border-white/[0.12] rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-xs font-medium text-white/80">
            {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setSelectedProducts([])} className="h-7 px-2.5 text-xs text-white/60 hover:text-white rounded-md">
              Clear
            </Button>
            {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
              <Button
                onClick={handleBulkDelete}
                className="h-7 px-2.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.15] rounded-md active:scale-[0.97] transition-all"
              >
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Fetch Error */}
      {fetchError && (
        <div className="linear-card bg-white/[0.04] border border-white/[0.15] rounded-lg p-3 mb-4 flex items-center justify-between">
          <p className="text-xs text-white/80">Failed to load products: {fetchError}</p>
          <Button onClick={() => fetchProducts()} className="h-7 px-2.5 text-xs bg-[#5e6ad2] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-medium rounded-md">
            Retry
          </Button>
        </div>
      )}

      {/* Products Table */}
      <div className="linear-card bg-[#161824] rounded-lg border border-[#232636] overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-10">
            <p className="text-xs text-white/50 font-medium">Loading products...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#10121b] border-b border-[#232636]">
                <tr>
                  <th className="px-3.5 py-2 text-left w-10">
                    <Input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-white/[0.15] bg-[#10121b] text-white focus:ring-white/20 w-3.5 h-3.5"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">Product</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">Category</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">Price</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">Stock</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-white/50 uppercase tracking-wider">Rating</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-white/50 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[#161824] divide-y divide-[#232636]">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-white/[0.025] transition-colors duration-100 group">
                    <td className="px-3.5 py-2.5">
                      <Input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                        className="rounded border-white/[0.15] bg-[#10121b] text-white focus:ring-white/20 w-3.5 h-3.5"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 bg-[#1b1e2c] border border-[#232636] rounded-md flex items-center justify-center overflow-hidden shrink-0">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-md"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[#F7F8F8] tracking-tight truncate max-w-xs sm:max-w-sm">
                            {product.name}
                            {product.featured && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-white/[0.08] text-white/90 border border-white/[0.12]">
                                <Star className="w-2.5 h-2.5 mr-0.5 text-white/80" />
                                Featured
                              </span>
                            )}
                            {product.isNew && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-white/[0.10] text-white border border-white/[0.15]">
                                New
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-white/40 font-mono flex items-center gap-2">
                            <span>SKU: {product.sku}</span>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{product.slug || product.id}</span>
                          </div>
                          {hasDeliveryOffer(product) && (
                            <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-white/[0.08] px-1.5 py-0.2 text-[9px] font-semibold text-white/90 border border-white/[0.12]">
                              {getDeliveryOfferLabel(product)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-white/80">{product.category}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-medium text-[#F7F8F8]">{formatPrice(product.price)}</div>
                      {product.originalPrice != null && product.originalPrice > product.price && (
                        <div className="text-[10px] text-white/40 line-through">{formatPrice(product.originalPrice)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className={clsx('text-xs', getStockColor(product.stock))}>
                        {product.stock} units
                      </div>
                      {product.variants.length > 0 && (
                        <div className="text-[10px] text-white/40">{product.variants.length} variant{product.variants.length === 1 ? '' : 's'}</div>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span className={clsx('inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium w-fit gap-1', getStatusColor(product.status))}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', product.status === 'active' ? 'bg-[#161824]' : 'bg-white/40')} />
                          <span className="capitalize">{product.status.replace('_', ' ')}</span>
                        </span>
                        {product.hasPendingShortlist && (
                          <span
                            className="inline-flex items-center h-4.5 px-1.5 rounded-full text-[9px] font-medium bg-white/[0.08] text-white/80 border border-white/[0.12] w-fit"
                            title="This product is unlisted but has pending orders in shortlist"
                          >
                            ⚠️ Unlisted Pending
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3.5 h-3.5 text-white/80" />
                        <span className="text-xs text-[#F7F8F8] font-medium">{product.rating}</span>
                        <span className="text-[10px] text-white/40">({product.reviews})</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <Link
                          href={`/admin/products/${productUrlKey(product)}`}
                          className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white rounded-md hover:bg-white/[0.08] active:scale-[0.96] transition-all"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {hasPermission(PERMISSIONS.PRODUCTS_EDIT) && (
                          <Link
                            href={`/admin/products/${productUrlKey(product)}/edit`}
                            className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white rounded-md hover:bg-white/[0.08] active:scale-[0.96] transition-all"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
                          <button
                            type="button"
                            onClick={async () => {
                              const confirmed = await requestConfirmation({ title: 'Delete this product?', description: `${product.name} will be permanently deleted.`, confirmLabel: 'Delete product', tone: 'danger' });
                              if (confirmed) {
                                await handleDeleteProduct(product.id);
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white rounded-md hover:bg-white/[0.08] active:scale-[0.96] transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
            <p className="text-[#62666D]">No products found matching your criteria.</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#232636] bg-[#10121b]/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#8A8F98]">
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
                className="rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] px-3 py-2 text-sm focus:ring-2 focus:ring-white/20"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </Select>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  className="inline-flex items-center rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#1b1e2c] transition-colors"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5 text-[#8A8F98]" />
                  Previous
                </button>
                <span className="text-xs text-[#8A8F98] px-1">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                  className="inline-flex items-center rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#1b1e2c] transition-colors"
                >
                  Next
                  <ChevronRight className="ml-1 h-3.5 w-3.5 text-[#8A8F98]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
