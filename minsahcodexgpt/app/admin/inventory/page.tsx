'use client';





import { useToast } from '@/components/ui/ToastProvider';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  useAdminInventory,
  type AdminInventoryItem,
} from '@/contexts/AdminInventoryContext';
import { convertUSDtoBDT, formatPrice } from '@/utils/currency';

type InventoryTab = 'inventory' | 'shortlist' | 'suppliers' | 'purchase-orders';
type AdjustAction = 'add' | 'remove' | 'set' | 'reorder';

interface StockModalState {
  item: AdminInventoryItem | null;
  ids: string[];
  action: AdjustAction | null;
  amount: string;
}

const QUICK_AMOUNTS = [5, 10, 25, 50];

export default function InventoryPage() {
  const { hasPermission } = useAdminAuth();
  const { pushToast } = useToast();
  const canEdit = hasPermission(PERMISSIONS.PRODUCTS_EDIT);
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as InventoryTab) || 'inventory';
  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailItem, setDetailItem] = useState<AdminInventoryItem | null>(null);
  const [stockModal, setStockModal] = useState<StockModalState>({ item: null, ids: [], action: null, amount: '' });
  const [saving, setSaving] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [purchaseOrderModalOpen, setPurchaseOrderModalOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ code: '', name: '', contactPerson: '', email: '', phone: '', address: '', paymentTerms: '', notes: '' });
  const [purchaseOrderForm, setPurchaseOrderForm] = useState({
    supplierId: '',
    notes: '',
    shippingCost: '0',
    taxAmount: '0',
    items: [{ productId: '', quantity: '1', unitCost: '' }],
  });

  const {
    inventory,
    shortlist,
    suppliers,
    purchaseOrders,
    categories,
    stats,
    filters,
    setFilters,
    loading,
    refreshing,
    error,
    refreshWorkspace,
    adjustInventory,
    updateShortlist,
    createSupplier,
    createPurchaseOrder,
    receivePurchaseOrder,
  } = useAdminInventory();

  const allVisibleSelected = inventory.length > 0 && selectedIds.length === inventory.length;
  const lowStockVisible = inventory.filter((item) => item.status === 'low_stock' || item.status === 'out_of_stock').length;
  const selectedSupplier = useMemo(() => suppliers.find((supplier) => supplier.id === purchaseOrderForm.supplierId) || null, [purchaseOrderForm.supplierId, suppliers]);
  const purchaseOrderTotal = useMemo(() => purchaseOrderForm.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitCost) || 0)), 0) + (Number(purchaseOrderForm.shippingCost) || 0) + (Number(purchaseOrderForm.taxAmount) || 0), [purchaseOrderForm]);

  const showToast = (type: 'success' | 'error', message: string) => {
    pushToast({ tone: type === 'success' ? 'success' : 'danger', description: message });
  };

  const openSingleModal = (item: AdminInventoryItem, action: AdjustAction) => {
    setStockModal({
      item,
      ids: [item.id],
      action,
      amount: action === 'set' ? String(item.currentStock) : action === 'reorder' ? String(item.reorderLevel) : '',
    });
  };

  const openBulkModal = (action: AdjustAction) => {
    if (!selectedIds.length) return;
    setStockModal({ item: null, ids: selectedIds, action, amount: '' });
  };

  const closeStockModal = () => {
    setStockModal({ item: null, ids: [], action: null, amount: '' });
  };

  const handleAdjustInventory = async () => {
    if (!stockModal.action || !stockModal.ids.length) return;
    const parsed = parseInt(stockModal.amount, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      showToast('error', 'Valid quantity din.');
      return;
    }
    setSaving(true);
    try {
      await adjustInventory({
        ids: stockModal.ids,
        action: stockModal.action,
        amount: stockModal.action === 'add' || stockModal.action === 'remove' ? parsed : undefined,
        quantity: stockModal.action === 'set' ? parsed : undefined,
        reorderLevel: stockModal.action === 'reorder' ? parsed : undefined,
      });
      showToast('success', 'Inventory update successful.');
      closeStockModal();
      setSelectedIds([]);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Inventory update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleShortlist = async (item: AdminInventoryItem) => {
    try {
      await updateShortlist({ productId: item.id, action: item.shortlisted ? 'remove' : 'add', priority: item.shortlisted ? 0 : 1 });
      showToast('success', item.shortlisted ? 'Shortlist theke remove kora hoyeche.' : 'Shortlist-e add kora hoyeche.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Shortlist update failed');
    }
  };

  const handleCreateSupplier = async () => {
    if (!supplierForm.name.trim()) {
      showToast('error', 'Supplier name lagbe.');
      return;
    }
    setSaving(true);
    try {
      await createSupplier(supplierForm);
      setSupplierModalOpen(false);
      setSupplierForm({ code: '', name: '', contactPerson: '', email: '', phone: '', address: '', paymentTerms: '', notes: '' });
      showToast('success', 'Supplier create hoyeche.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Supplier create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePurchaseOrder = async () => {
    if (!purchaseOrderForm.supplierId) {
      showToast('error', 'Supplier select korun.');
      return;
    }
    const normalizedItems = purchaseOrderForm.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity), unitCost: Number(item.unitCost) })).filter((item) => item.productId && item.quantity > 0 && item.unitCost >= 0);
    if (!normalizedItems.length) {
      showToast('error', 'At least one valid purchase item lagbe.');
      return;
    }
    setSaving(true);
    try {
      await createPurchaseOrder({
        supplierId: purchaseOrderForm.supplierId,
        notes: purchaseOrderForm.notes,
        shippingCost: Number(purchaseOrderForm.shippingCost) || 0,
        taxAmount: Number(purchaseOrderForm.taxAmount) || 0,
        items: normalizedItems,
      });
      setPurchaseOrderModalOpen(false);
      setPurchaseOrderForm({ supplierId: '', notes: '', shippingCost: '0', taxAmount: '0', items: [{ productId: '', quantity: '1', unitCost: '' }] });
      setActiveTab('purchase-orders');
      showToast('success', 'Purchase order create hoyeche.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Purchase order create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReceivePurchaseOrder = async (purchaseOrderId: string) => {
    setSaving(true);
    try {
      await receivePurchaseOrder(purchaseOrderId);
      showToast('success', 'Stock received. Inventory has been updated in real time.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Receive failed');
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission(PERMISSIONS.PRODUCTS_VIEW)) {
    return <div className="flex h-64 items-center justify-center"><p className="text-[#8a8f98]">You don&apos;t have permission to view inventory.</p></div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F7F8F8]">Inventory Workspace</h1>
          <p className="text-xs text-[#8A8F98] mt-0.5">Realtime stock, supplier, shortlist, and purchase-rate control in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setSupplierModalOpen(true)} className="h-8 rounded-lg border border-[#232636] bg-white/[0.05] px-3 text-xs font-medium text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.98]">Supplier Add</Button>
          <Button type="button" onClick={() => setPurchaseOrderModalOpen(true)} className="h-8 rounded-lg bg-[#5e6ad2] hover:bg-[#6d78d5] text-white px-3.5 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all active:scale-[0.98]">Purchase Order</Button>
          <Button type="button" onClick={() => refreshWorkspace(true)} disabled={refreshing} className="h-8 inline-flex items-center rounded-lg border border-[#232636] bg-white/[0.05] px-3 text-xs font-medium text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.98] disabled:opacity-50">
            <RefreshCw className={clsx('mr-1.5 h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard title="Inventory Value" value={formatPrice(convertUSDtoBDT(stats.totalValue))} />
        <SummaryCard title="Products" value={String(stats.totalProducts)} />
        <SummaryCard title="Low Stock" value={String(stats.lowStockCount)} tone="warning" />
        <SummaryCard title="Out of Stock" value={String(stats.outOfStockCount)} tone="danger" />
        <SummaryCard title="Overstocked" value={String(stats.overstockedCount)} tone="info" />
        <SummaryCard title="Shortlist" value={String(stats.shortlistCount)} tone="accent" />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5 p-1 bg-[#10121b] border border-[#232636] rounded-xl w-fit">
        {(['inventory', 'shortlist', 'suppliers', 'purchase-orders'] as InventoryTab[]).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={clsx('rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all active:scale-[0.98]', activeTab === tab ? 'bg-white/[0.12] text-[#F7F8F8] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' : 'text-[#8A8F98] hover:text-white hover:bg-white/[0.04]')}>
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-400">
          {error}
        </div>
      )}

      {activeTab === 'inventory' && (
        <>
          <div className="mb-4 rounded-xl border border-[#232636] bg-[#10121b] p-3.5 linear-card shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#62666D]" />
                <Input value={filters.search} onChange={(event) => setFilters({ search: event.target.value })} placeholder="Search by product, SKU, brand, category..." className="w-full rounded-lg border border-[#232636] bg-[#10121b] py-1.5 pl-9 pr-3 text-xs text-[#F7F8F8] placeholder-[#62666D] focus:border-white/20 focus:ring-1 focus:ring-white/20" />
              </div>
              <Select value={filters.status} onChange={(event) => setFilters({ status: event.target.value })} className="rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] px-3 py-1.5 text-xs focus:border-white/20 focus:ring-1 focus:ring-white/20">
                <option value="all">All Status</option><option value="in_stock">In Stock</option><option value="low_stock">Low Stock</option><option value="out_of_stock">Out of Stock</option><option value="overstocked">Overstocked</option>
              </Select>
              <Select value={filters.category} onChange={(event) => setFilters({ category: event.target.value })} className="rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] px-3 py-1.5 text-xs focus:border-white/20 focus:ring-1 focus:ring-white/20">
                <option value="all">All Categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </Select>
              <Select value={filters.sort} onChange={(event) => setFilters({ sort: event.target.value })} className="rounded-lg border border-[#232636] bg-[#10121b] text-[#F7F8F8] px-3 py-1.5 text-xs focus:border-white/20 focus:ring-1 focus:ring-white/20">
                <option value="stock">Stock Level</option><option value="lowStock">Low Stock Priority</option><option value="value">Value</option><option value="updated">Recently Updated</option><option value="name">Name</option>
              </Select>
              <div className="rounded-lg bg-[#10121b] border border-[#232636] px-3 py-2 text-xs text-[#8A8F98]"><span className="font-semibold text-[#F7F8F8]">{inventory.length}</span> visible items, <span className="font-semibold text-rose-400">{lowStockVisible}</span> urgent.</div>
              <div className="rounded-lg bg-white/[0.04] border border-[#232636] px-3 py-2 text-xs text-[#D0D6E0]">Supplier-linked products: <span className="font-semibold text-white">{inventory.filter((item) => item.supplierCount > 0).length}</span></div>
            </div>
          </div>

          {canEdit && selectedIds.length > 0 && (
            <div className="mb-4 rounded-xl border border-white/[0.12] bg-[#10121b] p-3.5 linear-card shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-[#F7F8F8]">{selectedIds.length} products selected</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => openBulkModal('add')} className="h-7 rounded-md border border-[#232636] bg-white/[0.05] px-2.5 text-xs text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97]">Bulk Add</Button>
                  <Button type="button" onClick={() => openBulkModal('remove')} className="h-7 rounded-md border border-[#232636] bg-white/[0.05] px-2.5 text-xs text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97]">Bulk Remove</Button>
                  <Button type="button" onClick={() => openBulkModal('set')} className="h-7 rounded-md border border-[#232636] bg-white/[0.05] px-2.5 text-xs text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97]">Set Qty</Button>
                  <Button type="button" onClick={() => openBulkModal('reorder')} className="h-7 rounded-md border border-[#232636] bg-white/[0.05] px-2.5 text-xs text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97]">Set Reorder</Button>
                  <Button type="button" onClick={() => setSelectedIds([])} className="h-7 rounded-md px-2.5 text-xs text-[#8A8F98] hover:text-white transition-all active:scale-[0.97]">Clear</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {activeTab === 'inventory' && (
        <div className="overflow-hidden rounded-xl border border-[#232636] bg-[#10121b] linear-card shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#10121b] border-b border-[#232636]">
                <tr>
                  {canEdit && <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#8A8F98] w-10"><Input type="checkbox" checked={allVisibleSelected} onChange={() => setSelectedIds(allVisibleSelected ? [] : inventory.map((item) => item.id))} /></th>}
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#8A8F98]">Product</th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#8A8F98]">Purchase Snapshot</th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#8A8F98]">Stock</th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#8A8F98]">Cost</th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[#8A8F98]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232636] bg-[#10121b]">
                {loading ? Array.from({ length: 6 }).map((_, index) => <tr key={index}><td colSpan={6} className="px-3.5 py-3"><div className="h-4 animate-pulse rounded bg-white/[0.04]" /></td></tr>) : inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.03] transition-colors">
                    {canEdit && <td className="px-3.5 py-2.5"><Input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])} /></td>}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-start gap-2.5">
                        <button type="button" onClick={() => handleToggleShortlist(item)} className={clsx('mt-0.5 p-1 rounded hover:bg-white/[0.04] active:scale-[0.95] transition-all', item.shortlisted ? 'text-amber-400' : 'text-[#62666D] hover:text-amber-400')}>
                          <Star className={clsx('h-4 w-4', item.shortlisted && 'fill-current')} />
                        </button>
                        <div>
                          <p className="text-xs font-medium text-[#F7F8F8]">{item.productName}</p>
                          <p className="text-[11px] text-[#8A8F98]">{item.sku} / {item.brand} / {item.category}</p>
                          <p className="mt-0.5 text-[10px] text-[#62666D]">Updated {new Date(item.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs">
                      <p className="font-medium text-[#F7F8F8]">{item.preferredSupplierName || item.lastSupplierName || 'No supplier yet'}</p>
                      <p className="text-[11px] text-[#8A8F98]">Last rate: {item.lastPurchaseRate === null ? 'N/A' : formatPrice(convertUSDtoBDT(item.lastPurchaseRate))}</p>
                      <p className="text-[11px] text-[#8A8F98]">Lowest: {item.lowestPurchaseRate === null ? 'N/A' : `${formatPrice(convertUSDtoBDT(item.lowestPurchaseRate))} (${item.lowestSupplierName || 'Unknown'})`}</p>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs">
                      <p className="font-semibold text-[#F7F8F8]">{item.currentStock}</p>
                      <p className="text-[11px] text-[#8A8F98]">Reorder {item.reorderLevel}</p>
                      <span className={clsx('mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', item.status === 'out_of_stock' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : item.status === 'low_stock' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : item.status === 'overstocked' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20')}>{item.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs">
                      <p className="text-[#F7F8F8]">{item.costPrice === null ? 'Not set' : formatPrice(convertUSDtoBDT(item.costPrice))}</p>
                      <p className="text-[11px] text-[#8A8F98]">Last buy {item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-[11px] text-[#8A8F98]">Supplier count {item.supplierCount}</p>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setDetailItem(item)} className="h-7 w-7 p-0 flex items-center justify-center rounded-md border border-[#232636] bg-white/[0.05] text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97]"><Eye className="h-3.5 w-3.5" /></button>
                        {canEdit && <>
                          <button type="button" onClick={() => openSingleModal(item, 'add')} className="h-7 w-7 p-0 flex items-center justify-center rounded-md border border-[#232636] bg-white/[0.05] text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97]"><Plus className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => openSingleModal(item, 'remove')} className="h-7 w-7 p-0 flex items-center justify-center rounded-md border border-[#232636] bg-white/[0.05] text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] transition-all active:scale-[0.97]"><Minus className="h-3.5 w-3.5" /></button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'shortlist' && (
        <div className="grid gap-4">
          {shortlist.map((item) => (
            <div key={item.shortlistId} className="rounded-xl border border-[#232636] bg-[#161824] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-current text-amber-500" />
                    <h3 className="font-semibold text-[#F7F8F8]">{item.productName}</h3>
                  </div>
                  <p className="mt-1 text-sm text-[#8A8F98]">{item.sku} / {item.brand} / {item.category}</p>
                  <p className="mt-2 text-sm text-[#D0D6E0]">{item.note || 'No shortlist note yet.'}</p>
                </div>
                <div className="text-sm text-[#8A8F98]">
                  <p>Priority: {item.priority}</p>
                  <p>Stock: {item.currentStock}</p>
                  <p>Status: {item.status.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>
          ))}
          {!shortlist.length && <EmptyState title="Shortlist empty" description="Inventory row-er star button diye shortlist build korte parben." />}
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="rounded-xl border border-[#232636] bg-[#161824] p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-semibold text-[#F7F8F8]">{supplier.name}</h3><p className="text-sm text-[#8A8F98]">{supplier.code}</p></div>
                <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', supplier.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.04] text-[#8A8F98] border border-[#232636]')}>{supplier.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#8A8F98]">
                <p>Contact: {supplier.contactPerson || 'N/A'}</p>
                <p>Email: {supplier.email || 'N/A'}</p>
                <p>Phone: {supplier.phone || 'N/A'}</p>
                <p>Payment Terms: {supplier.paymentTerms || 'N/A'}</p>
                <p>Products: {supplier.productCount} / PO: {supplier.purchaseOrderCount}</p>
              </div>
            </div>
          ))}
          {!suppliers.length && <EmptyState title="No suppliers yet" description="Supplier create korle procurement history live track hobe." />}
        </div>
      )}

      {activeTab === 'purchase-orders' && (
        <div className="overflow-hidden rounded-lg border border-[#232636] bg-[#161824]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#10121b] border-b border-[#232636]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8F98]">PO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8F98]">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8F98]">Amounts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8F98]">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#8A8F98]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232636] bg-[#161824]">
                {purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="px-4 py-4 text-sm"><p className="font-medium text-[#F7F8F8]">{po.orderNumber}</p><p className="text-xs text-[#8A8F98]">{po.itemCount} items / {po.receivedUnits} received</p></td>
                    <td className="px-4 py-4 text-sm text-[#D0D6E0]">{po.supplier.name} ({po.supplier.code})</td>
                    <td className="px-4 py-4 text-sm text-[#D0D6E0]">{formatPrice(convertUSDtoBDT(po.totalAmount))}</td>
                    <td className="px-4 py-4 text-sm"><span className="rounded-full bg-white/[0.04] border border-[#232636] px-3 py-1 text-xs font-medium text-[#8A8F98]">{po.status.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-4">{po.status !== 'RECEIVED' && <button type="button" onClick={() => handleReceivePurchaseOrder(po.id)} className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all active:scale-[0.98]"><Truck className="mr-1.5 h-3.5 w-3.5" />Receive</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!purchaseOrders.length && <EmptyState title="No purchase orders yet" description="Create a purchase order, then use the receiving flow to update stock in real time." />}
        </div>
      )}

      {detailItem ? (
        <Drawer
          open
          onClose={() => setDetailItem(null)}
          title={detailItem.productName}
          description={`${detailItem.sku} / ${detailItem.brand}`}
          size="lg"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard label="Current Stock" value={String(detailItem.currentStock)} />
            <DetailCard label="Reorder Level" value={String(detailItem.reorderLevel)} />
            <DetailCard label="Last Purchase Rate" value={detailItem.lastPurchaseRate === null ? 'N/A' : formatPrice(convertUSDtoBDT(detailItem.lastPurchaseRate))} />
            <DetailCard label="Last Purchase Supplier" value={detailItem.lastSupplierName || 'N/A'} />
            <DetailCard label="Last Purchase Date" value={detailItem.lastPurchaseDate ? new Date(detailItem.lastPurchaseDate).toLocaleDateString() : 'N/A'} />
            <DetailCard label="Lowest Purchase Rate" value={detailItem.lowestPurchaseRate === null ? 'N/A' : formatPrice(convertUSDtoBDT(detailItem.lowestPurchaseRate))} />
            <DetailCard label="Lowest Rate Supplier" value={detailItem.lowestSupplierName || 'N/A'} />
            <DetailCard label="Lowest Rate Date" value={detailItem.lowestPurchaseDate ? new Date(detailItem.lowestPurchaseDate).toLocaleDateString() : 'N/A'} />
          </div>
          <div className="mt-6 rounded-xl border border-[#232636] p-4 bg-[#10121b]">
            <p className="text-sm font-semibold text-[#F7F8F8]">Inventory shortlist</p>
            <p className="mt-2 text-sm text-[#8A8F98]">{detailItem.shortlisted ? detailItem.shortlistNote || 'Shortlisted, note not set yet.' : 'Ei product ekhono shortlist-e nei.'}</p>
            <div className="mt-4"><Link href={`/admin/products/${detailItem.id}/edit`} className="text-sm font-medium text-[#5e6ad2] hover:text-[#6d78d5]">Open product edit</Link></div>
          </div>
        </Drawer>
      ) : null}

      <Modal
        open={Boolean(stockModal.action)}
        onClose={closeStockModal}
        title={`${stockModal.item ? stockModal.item.productName : `${stockModal.ids.length} products`} / ${stockModal.action ?? 'adjust'}`}
        size="md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeStockModal}>Cancel</Button>
            <Button type="button" onClick={handleAdjustInventory} disabled={saving} aria-busy={saving || undefined}>{saving ? 'Saving...' : 'Save'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Quantity" type="number" min="0" value={stockModal.amount} onChange={(event) => setStockModal((prev) => ({ ...prev, amount: event.target.value }))} />
          <div className="flex flex-wrap gap-2">{QUICK_AMOUNTS.map((value) => <Button key={value} type="button" variant="secondary" size="sm" onClick={() => setStockModal((prev) => ({ ...prev, amount: String(value) }))}>{value}</Button>)}</div>
        </div>
      </Modal>

      {supplierModalOpen && (
        <SimpleModal title="Create Supplier" onClose={() => setSupplierModalOpen(false)} onSubmit={handleCreateSupplier} saving={saving}>
          <TwoColInput label="Code" value={supplierForm.code} onChange={(value) => setSupplierForm((prev) => ({ ...prev, code: value }))} />
          <TwoColInput label="Name" value={supplierForm.name} onChange={(value) => setSupplierForm((prev) => ({ ...prev, name: value }))} required />
          <TwoColInput label="Contact" value={supplierForm.contactPerson} onChange={(value) => setSupplierForm((prev) => ({ ...prev, contactPerson: value }))} />
          <TwoColInput label="Email" value={supplierForm.email} onChange={(value) => setSupplierForm((prev) => ({ ...prev, email: value }))} />
          <TwoColInput label="Phone" value={supplierForm.phone} onChange={(value) => setSupplierForm((prev) => ({ ...prev, phone: value }))} />
          <TwoColInput label="Payment Terms" value={supplierForm.paymentTerms} onChange={(value) => setSupplierForm((prev) => ({ ...prev, paymentTerms: value }))} />
        </SimpleModal>
      )}

      <Modal
        open={purchaseOrderModalOpen}
        onClose={() => setPurchaseOrderModalOpen(false)}
        title="Create Purchase Order"
        description={selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.code})` : 'Select supplier first'}
        size="xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setPurchaseOrderModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleCreatePurchaseOrder} disabled={saving} aria-busy={saving || undefined}>{saving ? 'Saving...' : 'Create PO'}</Button>
          </>
        }
      >
            <div className="space-y-4">
              <Select value={purchaseOrderForm.supplierId} onChange={(event) => setPurchaseOrderForm((prev) => ({ ...prev, supplierId: event.target.value }))} className="w-full rounded-lg border border-[#232636] px-4 py-2">
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.code})</option>)}
              </Select>
              {purchaseOrderForm.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-[#232636] bg-[#161824] p-4 md:grid-cols-[1.5fr,120px,140px,auto]">
                  <Select value={item.productId} onChange={(event) => setPurchaseOrderForm((prev) => ({ ...prev, items: prev.items.map((row, rowIndex) => rowIndex === index ? { ...row, productId: event.target.value } : row) }))} className="rounded-lg border border-[#232636] px-3 py-2">
                    <option value="">Select product</option>
                    {inventory.map((product) => <option key={product.id} value={product.id}>{product.productName}</option>)}
                  </Select>
                  <Input value={item.quantity} onChange={(event) => setPurchaseOrderForm((prev) => ({ ...prev, items: prev.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row) }))} placeholder="Qty" className="rounded-lg border border-[#232636] px-3 py-2" />
                  <Input value={item.unitCost} onChange={(event) => setPurchaseOrderForm((prev) => ({ ...prev, items: prev.items.map((row, rowIndex) => rowIndex === index ? { ...row, unitCost: event.target.value } : row) }))} placeholder="Unit Cost" className="rounded-lg border border-[#232636] px-3 py-2" />
                  <button type="button" onClick={() => setPurchaseOrderForm((prev) => ({ ...prev, items: prev.items.length === 1 ? prev.items : prev.items.filter((_, rowIndex) => rowIndex !== index) }))} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-all">Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => setPurchaseOrderForm((prev) => ({ ...prev, items: [...prev.items, { productId: '', quantity: '1', unitCost: '' }] }))} className="rounded-lg border border-[#232636] bg-white/[0.04] px-4 py-2 text-xs font-medium text-[#D0D6E0] hover:bg-white/[0.08] hover:text-white transition-all">Add Item</button>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input value={purchaseOrderForm.shippingCost} onChange={(event) => setPurchaseOrderForm((prev) => ({ ...prev, shippingCost: event.target.value }))} placeholder="Shipping cost" className="rounded-lg border border-[#232636] px-3 py-2" />
                <Input value={purchaseOrderForm.taxAmount} onChange={(event) => setPurchaseOrderForm((prev) => ({ ...prev, taxAmount: event.target.value }))} placeholder="Tax amount" className="rounded-lg border border-[#232636] px-3 py-2" />
                <div className="rounded-lg bg-[#10121b] border border-[#232636] px-4 py-3 text-sm font-semibold text-[#F7F8F8]">Total {formatPrice(convertUSDtoBDT(purchaseOrderTotal))}</div>
              </div>
            </div>
      </Modal>
    </div>
  );
}

function SummaryCard({ title, value, tone = 'default' }: { title: string; value: string; tone?: 'default' | 'warning' | 'danger' | 'info' | 'accent' }) {
  const toneClass = tone === 'warning' ? 'text-amber-300' : tone === 'danger' ? 'text-rose-400' : tone === 'info' ? 'text-blue-300' : tone === 'accent' ? 'text-white' : 'text-[#F7F8F8]';
  return (
    <div className="linear-card rounded-xl border border-[#232636] bg-[#10121b] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">{title}</p>
      <p className={clsx('mt-1.5 text-xl font-semibold tracking-tight', toneClass)}>{value}</p>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="linear-card rounded-xl border border-[#232636] bg-[#10121b] p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
      <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">{label}</p>
      <p className="mt-1 font-medium text-sm text-[#F7F8F8]">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="linear-card rounded-xl border border-[#232636] bg-[#10121b] p-10 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      <Package className="mx-auto mb-3 h-8 w-8 text-[#62666D]" />
      <h3 className="font-semibold text-sm text-[#F7F8F8]">{title}</h3>
      <p className="mt-1 text-xs text-[#8A8F98]">{description}</p>
    </div>
  );
}

function SimpleModal({
  title,
  children,
  onClose,
  onSubmit,
  saving,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={onSubmit} disabled={saving} aria-busy={saving || undefined}>{saving ? 'Saving...' : 'Save'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </Modal>
  );
}

function TwoColInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-[#8A8F98]">{label}{required ? ' *' : ''}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[#232636] px-3 py-2" />
    </label>
  );
}
