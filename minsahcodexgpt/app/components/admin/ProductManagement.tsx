'use client';






import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useState, useEffect } from 'react';
import type { AdminProduct, AdminCategory } from '@/types/admin';
import { generateMockProducts } from '@/types/admin';
import { formatPrice } from '@/utils/currency';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Grid3x3,
  Image,
  Tag,
  DollarSign,
  Archive,
  CheckCircle,
  X,
  ChevronDown,
  FileDown,
  PlusSquare
} from 'lucide-react';

export default function ProductManagement() {
  const { requestConfirmation } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockProducts = generateMockProducts();
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category.id === selectedCategory);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(product => product.status === selectedStatus);
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'stock':
          return a.inventory.quantity - b.inventory.quantity;
        case 'sales':
          return b.sales - a.sales;
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkEdit = () => {
    setShowBulkActions(true);
  };

  const handleBulkDelete = async () => {
    if (await requestConfirmation({ title: 'Delete selected products?', description: `This will delete ${selectedProducts.length} products.`, confirmLabel: 'Delete products', tone: 'danger' })) {
      // Simulate API call
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      setShowBulkActions(false);
    }
  };

  const handleExportCSV = () => {
    // CSV export logic
    const headers = ['ID', 'Name', 'SKU', 'Price', 'Stock', 'Sales', 'Status'];
    const csvData = filteredProducts.map(product => [
      product.id,
      product.name,
      product.sku,
      product.price.toString(),
      product.inventory.quantity.toString(),
      product.sales.toString(),
      product.status
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
  };

  const getStockStatus = (product: AdminProduct) => {
    const { quantity, lowStockThreshold } = product.inventory;
    if (quantity === 0) return { color: 'text-rose-300 bg-rose-500/15 border border-rose-500/30', text: 'Out of Stock' };
    if (quantity <= lowStockThreshold) return { color: 'text-amber-300 bg-amber-500/15 border border-amber-500/30', text: 'Low Stock' };
    return { color: 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30', text: 'In Stock' };
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white/[0.05] rounded w-64"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-[#161824] border border-[#232636] rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#161824] border border-[#232636] rounded-xl p-4">
                <div className="h-32 bg-[#10121b] rounded-lg mb-3"></div>
                <div className="h-4 bg-white/[0.05] rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-white/[0.03] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#232636]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#f7f8f8] tracking-tight">Product Management</h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">Manage beauty product catalog, pricing, and live inventory</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-[#232636] hover:bg-white/[0.08] text-[#f7f8f8] rounded-md text-[13px] font-medium transition-all"
          >
            <Upload className="h-3.5 w-3.5 text-[#8a8f98]" />
            <span>Bulk Upload</span>
          </Button>
          <Button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] border border-[#232636] hover:bg-white/[0.08] text-[#f7f8f8] rounded-md text-[13px] font-medium transition-all"
          >
            <Download className="h-3.5 w-3.5 text-[#8a8f98]" />
            <span>Export CSV</span>
          </Button>
          <Button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-[13px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#8a8f98]">Total Products</span>
            <PlusSquare className="h-4 w-4 text-[#8a8f98]" />
          </div>
          <p className="text-2xl font-semibold text-[#f7f8f8] tracking-tight">{products.length}</p>
        </div>
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#8a8f98]">In Stock</span>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-semibold text-[#f7f8f8] tracking-tight">
            {products.filter(p => p.inventory.quantity > 0).length}
          </p>
        </div>
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#8a8f98]">Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-semibold text-[#f7f8f8] tracking-tight">
            {products.filter(p => p.inventory.quantity <= p.inventory.lowStockThreshold && p.inventory.quantity > 0).length}
          </p>
        </div>
        <div className="bg-[#161824] border border-[#232636] rounded-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[#8a8f98]">Out of Stock</span>
            <X className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-semibold text-[#f7f8f8] tracking-tight">
            {products.filter(p => p.inventory.quantity === 0).length}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-[#161824] border border-[#232636] rounded-xl p-3.5 shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-[#8a8f98]" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/50 focus:border-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>

          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] rounded-md text-[13px] focus:border-[#5e6ad2]"
          >
            <option value="all">All Categories</option>
            <option value="CAT-1">Skincare</option>
            <option value="CAT-2">Makeup</option>
            <option value="CAT-3">Hair Care</option>
            <option value="CAT-4">Body Care</option>
          </Select>

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] rounded-md text-[13px] focus:border-[#5e6ad2]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] rounded-md text-[13px] focus:border-[#5e6ad2]"
          >
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="stock">Sort by Stock</option>
            <option value="sales">Sort by Sales</option>
            <option value="created">Sort by Date</option>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md border transition-colors ${viewMode === 'grid' ? 'bg-[#5e6ad2]/20 border-[#5e6ad2]/40 text-[#f7f8f8]' : 'bg-[#10121b] border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8]'}`}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md border transition-colors ${viewMode === 'list' ? 'bg-[#5e6ad2]/20 border-[#5e6ad2]/40 text-[#f7f8f8]' : 'bg-[#10121b] border-[#232636] text-[#8a8f98] hover:text-[#f7f8f8]'}`}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-[#1b1e2c] gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8a8f98]">
                {selectedProducts.length} products selected
              </span>
              <Button
                onClick={handleSelectAll}
                className="text-xs text-[#5e6ad2] hover:text-[#6d78d5] font-medium"
              >
                {selectedProducts.length === filteredProducts.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBulkEdit}
                className="px-3 py-1 bg-[#5e6ad2] text-white rounded-md hover:bg-[#6d78d5] text-xs font-medium transition-colors"
              >
                Bulk Edit
              </Button>
              <Button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 rounded-md text-xs font-medium transition-colors"
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Products Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3' : 'space-y-3'}>
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product);
          const isSelected = selectedProducts.includes(product.id);

          return viewMode === 'grid' ? (
            <div key={product.id} className="bg-[#161824] border border-[#232636] rounded-xl overflow-hidden hover:border-[#5e6ad2]/40 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelectProduct(product.id)}
                  aria-label={`Select ${product.name}`}
                  className="absolute top-2.5 left-2.5 z-10 w-4 h-4 rounded bg-[#10121b] border-[#232636] text-[#5e6ad2] focus:ring-[#5e6ad2]/40"
                />
                <div className="h-40 bg-[#10121b] border-b border-[#232636] flex items-center justify-center">
                  <Image className="h-10 w-10 text-[#8a8f98]/40" aria-hidden="true" />
                </div>
                <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 text-[11px] rounded-[4px] font-mono ${stockStatus.color}`}>
                  {stockStatus.text}
                </span>
              </div>
              <div className="p-3.5 space-y-2.5">
                <div>
                  <h3 className="text-[13px] font-medium text-[#f7f8f8] truncate">{product.name}</h3>
                  <p className="text-xs text-[#8a8f98] font-mono">{product.sku}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-[#f7f8f8]">{formatPrice(product.price)}</p>
                    {product.comparePrice && (
                      <p className="text-xs text-[#8a8f98] line-through">{formatPrice(product.comparePrice)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#8a8f98]">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span>{product.rating}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#1b1e2c]">
                  <div>
                    <span className="text-[#8a8f98]">Stock:</span>
                    <span className="ml-1 font-medium text-[#f7f8f8]">{product.inventory.quantity}</span>
                  </div>
                  <div>
                    <span className="text-[#8a8f98]">Sales:</span>
                    <span className="ml-1 font-medium text-[#f7f8f8]">{product.sales}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#1b1e2c]">
                  <span className={`px-2 py-0.5 text-[10px] rounded-[4px] font-mono ${
                    product.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                    product.status === 'draft' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                    'bg-white/[0.05] text-[#8a8f98] border border-[#232636]'
                  }`}>
                    {product.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => setEditingProduct(product)}
                      className="p-1 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button className="p-1 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded transition-colors" title="View">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button className="p-1 text-[#8a8f98] hover:text-rose-400 hover:bg-white/[0.06] rounded transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div key={product.id} className="bg-[#161824] border border-[#232636] rounded-xl p-3.5 hover:border-[#5e6ad2]/30 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelectProduct(product.id)}
                  aria-label={`Select ${product.name}`}
                  className="mt-1 w-4 h-4 rounded bg-[#10121b] border-[#232636] text-[#5e6ad2] focus:ring-[#5e6ad2]/40"
                />
                <div className="w-16 h-16 bg-[#10121b] border border-[#232636] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Image className="h-6 w-6 text-[#8a8f98]/40" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
                    <div>
                      <h3 className="text-[13px] font-medium text-[#f7f8f8] truncate">{product.name}</h3>
                      <p className="text-xs text-[#8a8f98] font-mono">{product.sku} • {product.brand}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] rounded-[4px] font-mono ${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] rounded-[4px] font-mono ${
                        product.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                        product.status === 'draft' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                        'bg-white/[0.05] text-[#8a8f98] border border-[#232636]'
                      }`}>
                        {product.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs py-1">
                    <div>
                      <span className="text-[#8a8f98]">Price:</span>
                      <span className="ml-1 font-medium text-[#f7f8f8]">{formatPrice(product.price)}</span>
                    </div>
                    <div>
                      <span className="text-[#8a8f98]">Stock:</span>
                      <span className="ml-1 font-medium text-[#f7f8f8]">{product.inventory.quantity}</span>
                    </div>
                    <div>
                      <span className="text-[#8a8f98]">Sales:</span>
                      <span className="ml-1 font-medium text-[#f7f8f8]">{product.sales}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span className="text-[#8a8f98]">{product.rating} ({product.reviews})</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1b1e2c]">
                    <p className="text-xs text-[#8a8f98] line-clamp-1">{product.description}</p>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        onClick={() => setEditingProduct(product)}
                        className="p-1 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button className="p-1 text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-white/[0.06] rounded transition-colors" title="View">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button className="p-1 text-[#8a8f98] hover:text-rose-400 hover:bg-white/[0.06] rounded transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-[#161824] border border-[#232636] rounded-xl">
          <PlusSquare className="h-10 w-10 text-[#8a8f98]/40 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-[#f7f8f8] mb-1">No products found</h3>
          <p className="text-xs text-[#8a8f98] mb-4">Try adjusting your search criteria or category filter</p>
          <Button
            onClick={() => setShowAddProduct(true)}
            className="px-3.5 py-1.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-[13px] font-medium"
          >
            Add Your First Product
          </Button>
        </div>
      )}

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[#232636]">
          <p className="text-xs text-[#8a8f98]">
            Showing {filteredProducts.length} of {products.length} products
          </p>
          <div className="flex items-center gap-1.5">
            <Button className="px-2.5 py-1 bg-[#161824] border border-[#232636] hover:bg-white/[0.06] text-[#8a8f98] hover:text-[#f7f8f8] rounded-md text-xs">
              Previous
            </Button>
            <Button className="px-2.5 py-1 bg-[#5e6ad2] text-white rounded-md text-xs font-medium">
              1
            </Button>
            <Button className="px-2.5 py-1 bg-[#161824] border border-[#232636] hover:bg-white/[0.06] text-[#8a8f98] hover:text-[#f7f8f8] rounded-md text-xs">
              2
            </Button>
            <Button className="px-2.5 py-1 bg-[#161824] border border-[#232636] hover:bg-white/[0.06] text-[#8a8f98] hover:text-[#f7f8f8] rounded-md text-xs">
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <Modal
        open={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        title="Bulk Upload Products"
        description="Upload a CSV file with your product data. Use the template for the required format."
        footer={
          <>
            <Button
              type="button"
              onClick={() => setShowBulkUpload(false)}
              className="px-3.5 py-1.5 bg-white/[0.04] border border-[#232636] hover:bg-white/[0.08] text-[#f7f8f8] rounded-md text-[13px] font-medium transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="px-4 py-1.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-[13px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all"
            >
              Upload Products
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/[0.04] border border-[#232636] hover:bg-white/[0.08] text-[#f7f8f8] rounded-md text-[13px] font-medium transition-colors"
          >
            <FileDown className="h-4 w-4 text-[#8a8f98]" aria-hidden="true" />
            <span>Download CSV Template</span>
          </Button>
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-[#232636] hover:border-[#5e6ad2]/60 p-6 text-center bg-[#10121b] transition-colors group">
            <Upload className="mx-auto mb-2 h-8 w-8 text-[#8a8f98] group-hover:text-[#5e6ad2] transition-colors" aria-hidden="true" />
            <span className="block text-sm font-medium text-[#f7f8f8]">
              Drop your CSV file here or select a file
            </span>
            <span className="block text-xs text-[#8a8f98] mt-1">Supports UTF-8 formatted .csv files</span>
            <input type="file" accept=".csv" className="sr-only" />
          </label>
        </div>
      </Modal>

      {/* Add/Edit Product Modal */}
      <Modal
        open={showAddProduct || Boolean(editingProduct)}
        onClose={() => {
          setShowAddProduct(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              onClick={() => {
                setShowAddProduct(false);
                setEditingProduct(null);
              }}
              className="px-3.5 py-1.5 bg-white/[0.04] border border-[#232636] hover:bg-white/[0.08] text-[#f7f8f8] rounded-md text-[13px] font-medium transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="px-4 py-1.5 bg-[#5e6ad2] hover:bg-[#6d78d5] text-white rounded-md text-[13px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all"
            >
              {editingProduct ? 'Save Changes' : 'Add Product'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-tight text-[#8a8f98]">Product Name</label>
            <Input
              type="text"
              defaultValue={editingProduct?.name}
              placeholder="Enter product name"
              className="w-full px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/40 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-tight text-[#8a8f98]">SKU</label>
            <Input
              type="text"
              defaultValue={editingProduct?.sku}
              placeholder="Enter SKU"
              className="w-full px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/40 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-tight text-[#8a8f98]">Price (BDT ৳)</label>
            <Input
              type="number"
              defaultValue={editingProduct?.price}
              placeholder="0.00"
              step="0.01"
              className="w-full px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/40 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-tight text-[#8a8f98]">Compare Price (BDT ৳)</label>
            <Input
              type="number"
              defaultValue={editingProduct?.comparePrice}
              placeholder="0.00"
              step="0.01"
              className="w-full px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/40 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-tight text-[#8a8f98]">Category</label>
            <Select
              defaultValue={editingProduct?.category.name || 'Skincare'}
              className="w-full px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] rounded-md text-[13px]"
            >
              <option value="Skincare">Skincare</option>
              <option value="Makeup">Makeup</option>
              <option value="Hair Care">Hair Care</option>
              <option value="Body Care">Body Care</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-tight text-[#8a8f98]">Brand</label>
            <Input
              type="text"
              defaultValue={editingProduct?.brand}
              placeholder="Enter brand"
              className="w-full px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/40 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-tight text-[#8a8f98]">Stock Quantity</label>
            <Input
              type="number"
              defaultValue={editingProduct?.inventory.quantity}
              placeholder="0"
              className="w-full px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/40 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-tight text-[#8a8f98]">Low Stock Threshold</label>
            <Input
              type="number"
              defaultValue={editingProduct?.inventory.lowStockThreshold}
              placeholder="10"
              className="w-full px-3 py-1.5 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/40 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-tight text-[#8a8f98]">Description</label>
            <Textarea
              rows={4}
              defaultValue={editingProduct?.description}
              placeholder="Enter product description"
              className="w-full px-3 py-2 bg-[#10121b] border border-[#232636] text-[#f7f8f8] placeholder-[#8a8f98]/40 focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] rounded-md text-[13px]"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
