'use client';

import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { adminFetchJson } from '@/lib/adminFetch';
import { Plus, ClipboardPaste } from 'lucide-react';

import { ApiProduct, ProductFilters, ProductPagination, AdminProductsResponse } from '@/components/admin/products/types';
import { ProductListFilterBar } from '@/components/admin/products/list/ProductListFilterBar';
import { ProductListFilterDrawer } from '@/components/admin/products/list/ProductListFilterDrawer';
import { ProductListBulkBar } from '@/components/admin/products/list/ProductListBulkBar';
import { ProductTable } from '@/components/admin/products/list/ProductTable';
import { ProductDeleteConfirmModal } from '@/components/admin/products/common/ProductDeleteConfirmModal';
import { AdminPaginationBar } from '@/components/admin/common/AdminPaginationBar';

export default function ProductsPage() {
  const { pushToast } = useToast();
  const { hasPermission } = useAdminAuth();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: 'All Categories',
    status: '',
    sortBy: 'created',
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

  // Modal deletion states
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    productId?: string;
    productName?: string;
    isBulk?: boolean;
    isDeleting?: boolean;
  }>({ isOpen: false });

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

  const handleOpenDeleteModal = (id: string, name: string) => {
    setDeleteModal({
      isOpen: true,
      productId: id,
      productName: name,
      isBulk: false,
      isDeleting: false,
    });
  };

  const handleOpenBulkDeleteModal = () => {
    if (selectedProducts.length === 0) return;
    setDeleteModal({
      isOpen: true,
      isBulk: true,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      if (deleteModal.isBulk) {
        for (const productId of selectedProducts) {
          await deleteProductById(productId);
        }
        pushToast({ tone: 'success', description: `Successfully deleted ${selectedProducts.length} products` });
        setSelectedProducts([]);
      } else if (deleteModal.productId) {
        await deleteProductById(deleteModal.productId);
        pushToast({ tone: 'success', description: 'Product successfully deleted' });
        setSelectedProducts((prev) => prev.filter((id) => id !== deleteModal.productId));
      }
      setDeleteModal({ isOpen: false });
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting product(s):', err);
      pushToast({ tone: 'danger', description: err instanceof Error ? err.message : 'Failed to delete' });
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const updateFilter = (key: keyof ProductFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedProducts([]);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'All Categories',
      status: '',
      sortBy: 'created',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedProducts([]);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.category !== 'All Categories' ||
      filters.status !== '' ||
      filters.sortBy !== 'created'
    );
  }, [filters]);

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

  const handleToggleSelect = (productId: string, checked: boolean) => {
    setSelectedProducts((prev) =>
      checked ? [...prev, productId] : prev.filter((id) => id !== productId)
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.03em] text-[#F7F8F8]">Products</h1>
          <p className="text-xs text-white/50 mt-0.5">Manage and organize your product catalog</p>
        </div>
        {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products/import"
              className="inline-flex items-center h-8.5 px-3 bg-[#161824] border border-[#232636] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-white/80 hover:text-white rounded-lg text-xs font-medium hover:bg-[#1b1e2c] active:scale-[0.97] transition-all duration-120"
            >
              <ClipboardPaste className="w-3.5 h-3.5 mr-1.5 text-white/60" />
              Claude Import
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center h-8.5 px-3.5 bg-[#5e6ad2] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] font-medium text-xs rounded-lg hover:bg-[#525ec2] active:scale-[0.97] transition-all duration-120"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
              Add Product
            </Link>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="linear-card bg-[#161824] rounded-lg border border-[#232636] p-3 shadow-sm">
        <ProductListFilterBar
          search={filters.search}
          onSearchChange={(val) => updateFilter('search', val)}
          sortBy={filters.sortBy}
          onSortByChange={(val) => updateFilter('sortBy', val)}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          hasActiveFilters={hasActiveFilters}
        />

        {showFilters && (
          <ProductListFilterDrawer
            category={filters.category}
            onCategoryChange={(val) => updateFilter('category', val)}
            status={filters.status}
            onStatusChange={(val) => updateFilter('status', val)}
          />
        )}
      </div>

      {/* Bulk Actions */}
      <ProductListBulkBar
        selectedCount={selectedProducts.length}
        onClear={() => setSelectedProducts([])}
        onBulkDelete={handleOpenBulkDeleteModal}
        canDelete={hasPermission(PERMISSIONS.PRODUCTS_DELETE)}
      />

      {/* Fetch Error */}
      {fetchError && (
        <div className="linear-card bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-center justify-between">
          <p className="text-xs text-rose-300">Failed to load products: {fetchError}</p>
          <Button
            type="button"
            onClick={() => fetchProducts()}
            className="h-7 px-4 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-md"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Products Table */}
      <ProductTable
        products={products}
        loading={loading}
        selectedProducts={selectedProducts}
        onSelectAll={handleSelectAll}
        onToggleSelect={handleToggleSelect}
        onDeleteProduct={handleOpenDeleteModal}
        canEdit={hasPermission(PERMISSIONS.PRODUCTS_EDIT)}
        canDelete={hasPermission(PERMISSIONS.PRODUCTS_DELETE)}
        onResetFilters={handleResetFilters}
      />

      {/* Pagination */}
      {!loading && products.length > 0 && (
        <div className="border border-[#232636] rounded-lg bg-[#161824] p-2">
          <AdminPaginationBar
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.totalCount}
            pages={pagination.totalPages}
            limitOptions={[25, 50, 100]}
            onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            onLimitChange={(l) => {
              setPagination((prev) => ({ ...prev, page: 1, limit: l }));
              setSelectedProducts([]);
            }}
          />
        </div>
      )}

      {/* Deletion Modal */}
      <ProductDeleteConfirmModal
        isOpen={deleteModal.isOpen}
        productName={deleteModal.productName}
        isBulk={deleteModal.isBulk}
        bulkCount={selectedProducts.length}
        isDeleting={deleteModal.isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false })}
      />
    </div>
  );
}
