'use client';

import React, { useState } from 'react';
import {
  Building2,
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  DollarSign,
  ChevronRight,
  Eye,
  PackageCheck,
  UserCheck
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  origin: string;
  skuCount: number;
  totalProcurement: number;
  leadTime: string;
  paymentTerms: string;
  status: 'Active' | 'Review' | 'Inactive';
}

interface PurchaseOrder {
  id: string;
  supplierName: string;
  createdAt: string;
  expectedDate: string;
  itemCount: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Due';
  fulfillmentStatus: 'Delivered' | 'In Transit' | 'Draft';
}

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'SUP-01', name: 'Golden Beauty Imports Korea', contactPerson: 'Kim Seung-ho', phone: '+82 2-555-0192', email: 'orders@goldenbeauty.kr', origin: 'South Korea', skuCount: 48, totalProcurement: 3400000, leadTime: '14 Days', paymentTerms: 'Net-30', status: 'Active' },
  { id: 'SUP-02', name: 'Dhaka Cosmetics Distribution Ltd', contactPerson: 'Ahsan Habib', phone: '+880 1711-223344', email: 'sales@dhakacosmetics.com', origin: 'Chawkbazar, Dhaka', skuCount: 28, totalProcurement: 1850000, leadTime: '3 Days', paymentTerms: 'Cash / 7 Days', status: 'Active' },
  { id: 'SUP-03', name: 'Global Skincare Direct Exporters', contactPerson: 'Park Ji-min', phone: '+82 2-789-4321', email: 'exports@globalskincare.kr', origin: 'South Korea', skuCount: 62, totalProcurement: 5200000, leadTime: '10 Days', paymentTerms: '50% Adv / 50% Ship', status: 'Active' },
  { id: 'SUP-04', name: 'Bangla Aroma & Organic Oils', contactPerson: 'Kamrul Hasan', phone: '+880 1912-889900', email: 'info@banglaaroma.com', origin: 'Chittagong, BD', skuCount: 12, totalProcurement: 620000, leadTime: '5 Days', paymentTerms: 'Cash on Delivery', status: 'Active' },
];

const INITIAL_POS: PurchaseOrder[] = [
  { id: 'PO-2024-0089', supplierName: 'Golden Beauty Imports Korea', createdAt: '2024-10-15', expectedDate: '2024-10-29', itemCount: 1200, totalAmount: 850000, paymentStatus: 'Partial', fulfillmentStatus: 'In Transit' },
  { id: 'PO-2024-0088', supplierName: 'Dhaka Cosmetics Distribution Ltd', createdAt: '2024-10-18', expectedDate: '2024-10-21', itemCount: 450, totalAmount: 280000, paymentStatus: 'Paid', fulfillmentStatus: 'Delivered' },
  { id: 'PO-2024-0087', supplierName: 'Global Skincare Direct Exporters', createdAt: '2024-10-10', expectedDate: '2024-10-24', itemCount: 1800, totalAmount: 1450000, paymentStatus: 'Due', fulfillmentStatus: 'In Transit' },
  { id: 'PO-2024-0086', supplierName: 'Bangla Aroma & Organic Oils', createdAt: '2024-10-20', expectedDate: '2024-10-25', itemCount: 300, totalAmount: 120000, paymentStatus: 'Paid', fulfillmentStatus: 'Draft' },
];

export default function SupplierManagementPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_POS);
  const [searchQuery, setSearchQuery] = useState('');
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states for modals
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierOrigin, setNewSupplierOrigin] = useState('');

  const [poSupplierId, setPoSupplierId] = useState('');
  const [poAmount, setPoAmount] = useState<number>(350000);
  const [poNotes, setPoNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadSuppliersData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/suppliers');
      if (res.ok) {
        const data = await res.json();
        if (data.suppliers && data.suppliers.length > 0) {
          setSuppliers(data.suppliers);
          if (!poSupplierId && data.suppliers[0]?.dbId) {
            setPoSupplierId(data.suppliers[0].dbId);
          }
        }
        if (data.purchaseOrders && data.purchaseOrders.length > 0) {
          setPurchaseOrders(data.purchaseOrders);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch suppliers from DB, using cache', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadSuppliersData();
  }, []);

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) {
      showToast('Supplier company name is required');
      return;
    }
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_SUPPLIER',
          name: newSupplierName,
          contactPerson: newSupplierContact,
          phone: newSupplierPhone,
          address: newSupplierOrigin,
          paymentTerms: 'Net-30',
        }),
      });
      if (res.ok) {
        showToast('New vendor profile saved to database!');
        setSupplierModalOpen(false);
        setNewSupplierName('');
        setNewSupplierContact('');
        setNewSupplierPhone('');
        setNewSupplierOrigin('');
        loadSuppliersData();
      } else {
        showToast('Error creating supplier');
      }
    } catch {
      showToast('Network error saving supplier');
    }
  };

  const handleCreatePO = async () => {
    try {
      const targetSupplierId = poSupplierId || (suppliers[0] as any)?.dbId || suppliers[0]?.id;
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_PO',
          supplierId: targetSupplierId,
          totalAmount: poAmount,
          notes: poNotes,
        }),
      });
      if (res.ok) {
        showToast('Purchase Order issued & recorded in database!');
        setPoModalOpen(false);
        setPoNotes('');
        loadSuppliersData();
      } else {
        showToast('Error issuing PO');
      }
    } catch {
      showToast('Network error issuing PO');
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00a572] text-[#002113] font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#273647]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#4edea3] uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Minsah Supply Chain // Procurement & PO Workflow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
            Suppliers & Procurement
          </h1>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            Manage international & domestic brand suppliers, purchase orders, and lead time economics.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setSupplierModalOpen(true)}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#4edea3]" />
            <span>Add Supplier</span>
          </button>

          <button
            onClick={() => setPoModalOpen(true)}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>Create Purchase Order (PO)</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Active Vendors</span>
            <Building2 className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">14</div>
          <div className="text-[11px] text-[#4edea3] mt-1 font-medium">Korea, Japan & BD Local</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Open Purchase Orders</span>
            <Truck className="w-4 h-4 text-[#ffb690]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffb690] font-mono">5 Active</div>
          <div className="text-[11px] text-[#908fa0] mt-1">2 Shipments in transit</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Procurement (This Month)</span>
            <DollarSign className="w-4 h-4 text-[#4edea3]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">৳ 12,40,000</div>
          <div className="text-[11px] text-[#908fa0] mt-1">3,750 beauty units</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Outstanding Payables</span>
            <AlertCircle className="w-4 h-4 text-[#ffb4ab]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffb4ab] font-mono">৳ 1,85,000</div>
          <div className="text-[11px] text-[#908fa0] mt-1">Within credit terms</div>
        </div>
      </div>

      {/* Supplier Directory Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#ffffff] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#4edea3]" />
            <span>Primary Brand Suppliers Directory</span>
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#908fa0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor, city, contact..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#122131] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] placeholder-[#908fa0] focus:outline-none focus:border-[#c0c1ff]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-[#122131] border border-[#273647] hover:border-[#4edea3]/50 rounded-xl p-4 space-y-3 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-xs text-[#ffffff] line-clamp-1">{supplier.name}</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00a572]/20 text-[#4edea3]">
                    {supplier.status}
                  </span>
                </div>
                <div className="text-[11px] text-[#908fa0] mt-1">{supplier.origin}</div>
                <div className="text-[11px] text-[#c0c1ff] font-mono mt-0.5">{supplier.contactPerson} ({supplier.phone})</div>
              </div>

              <div className="pt-3 border-t border-[#273647] space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#908fa0]">Supplied SKUs:</span>
                  <span className="font-mono text-[#ffffff] font-semibold">{supplier.skuCount} Products</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#908fa0]">Lead Time:</span>
                  <span className="font-mono text-[#4edea3] font-semibold">{supplier.leadTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#908fa0]">Total Lifetime:</span>
                  <span className="font-mono text-[#ffffff] font-bold">৳ {(supplier.totalProcurement / 100000).toFixed(1)}L</span>
                </div>
              </div>

              <button
                onClick={() => showToast(`Selected ${supplier.name} for PO creation`)}
                className="w-full py-1.5 bg-[#051424] hover:bg-[#1c2b3c] border border-[#273647] rounded-lg text-xs font-medium text-[#c0c1ff] transition-all"
              >
                Create PO for Vendor
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Orders Ledger Table */}
      <div className="bg-[#122131] border border-[#273647] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#273647] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#c0c1ff]" />
            <h3 className="text-sm font-bold text-[#ffffff]">Purchase Orders (PO) Ledger</h3>
            <span className="text-xs bg-[#1c2b3c] text-[#908fa0] px-2 py-0.5 rounded font-mono">
              {purchaseOrders.length}
            </span>
          </div>

          <button
            onClick={() => showToast('Procurement report exported to Excel!')}
            className="text-xs text-[#4edea3] hover:underline flex items-center gap-1 font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export POs</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1c2d] text-[#908fa0] uppercase tracking-wider font-mono text-[10px] border-b border-[#273647]">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Expected Delivery</th>
                <th className="py-3 px-4 text-center">Units</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-center">Fulfillment</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#273647]">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-[#1c2b3c]/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#c0c1ff]">{po.id}</td>
                  <td className="py-3 px-4 font-semibold text-[#ffffff]">{po.supplierName}</td>
                  <td className="py-3 px-4 font-mono text-[#908fa0]">{po.createdAt}</td>
                  <td className="py-3 px-4 font-mono text-[#4edea3]">{po.expectedDate}</td>
                  <td className="py-3 px-4 text-center font-mono text-[#ffffff]">{po.itemCount}</td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-[#ffffff]">
                    ৳ {po.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        po.paymentStatus === 'Paid'
                          ? 'bg-[#00a572]/20 text-[#4edea3]'
                          : po.paymentStatus === 'Partial'
                          ? 'bg-[#ec6a06]/20 text-[#ffb690]'
                          : 'bg-[#93000a]/20 text-[#ffb4ab]'
                      }`}
                    >
                      {po.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        po.fulfillmentStatus === 'Delivered'
                          ? 'bg-[#00a572]/20 text-[#4edea3]'
                          : po.fulfillmentStatus === 'In Transit'
                          ? 'bg-[#c0c1ff]/20 text-[#c0c1ff]'
                          : 'bg-[#464554]/20 text-[#908fa0]'
                      }`}
                    >
                      {po.fulfillmentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => showToast(`Receiving stock inspection for ${po.id}...`)}
                      className="px-2.5 py-1 bg-[#1c2b3c] hover:bg-[#273647] text-[#4edea3] rounded text-[11px] font-semibold transition-all"
                    >
                      Receive Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PO Creation Modal */}
      {poModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#122131] border border-[#273647] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#273647]">
              <h3 className="text-base font-bold text-[#ffffff] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#c0c1ff]" />
                <span>Issue New Purchase Order</span>
              </h3>
              <button onClick={() => setPoModalOpen(false)} className="text-[#908fa0] hover:text-[#ffffff] text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#908fa0] block mb-1">Select Supplier</label>
                <select
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#c0c1ff]"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={(s as any).dbId || s.id}>{s.name} ({s.origin})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#908fa0] block mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    defaultValue="2024-11-05"
                    className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#c0c1ff]"
                  />
                </div>
                <div>
                  <label className="text-[#908fa0] block mb-1">Estimated Quantity (Units)</label>
                  <input
                    type="number"
                    defaultValue={500}
                    className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-mono text-[#ffffff] focus:outline-none focus:border-[#c0c1ff]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1">Total Estimated Amount (৳)</label>
                <input
                  type="number"
                  value={poAmount}
                  onChange={(e) => setPoAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs font-mono text-[#4edea3] font-bold focus:outline-none focus:border-[#c0c1ff]"
                />
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1">Order Notes & Import Instructions</label>
                <textarea
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Ensure lot batch expiration is 2026 or later. Fast air cargo shipment."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] focus:outline-none focus:border-[#c0c1ff]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPoModalOpen(false)}
                className="flex-1 py-2 bg-[#1c2b3c] hover:bg-[#273647] text-[#d4e4fa] rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                className="flex-1 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold shadow-md"
              >
                Confirm & Issue PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Creation Modal */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#122131] border border-[#273647] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#273647]">
              <h3 className="text-base font-bold text-[#ffffff] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#4edea3]" />
                <span>Register New Beauty Supplier</span>
              </h3>
              <button onClick={() => setSupplierModalOpen(false)} className="text-[#908fa0] hover:text-[#ffffff] text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#908fa0] block mb-1">Company / Vendor Name</label>
                <input
                  type="text"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="e.g. Tokyo Glow Skincare Wholesale"
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#908fa0] block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    placeholder="Manager Name"
                    className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
                <div>
                  <label className="text-[#908fa0] block mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    placeholder="+880 / +82"
                    className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[#908fa0] block mb-1">Origin / Warehouse Location</label>
                <input
                  type="text"
                  value={newSupplierOrigin}
                  onChange={(e) => setNewSupplierOrigin(e.target.value)}
                  placeholder="e.g. South Korea, USA, UK, Japan"
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSupplierModalOpen(false)}
                className="flex-1 py-2 bg-[#1c2b3c] hover:bg-[#273647] text-[#d4e4fa] rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSupplier}
                className="flex-1 py-2 bg-[#4edea3] hover:bg-[#00a572] text-[#002113] rounded-lg text-xs font-bold shadow-md"
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
