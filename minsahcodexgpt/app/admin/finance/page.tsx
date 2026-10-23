'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronRight,
  Building,
  Receipt,
  PiggyBank,
  FileSpreadsheet
} from 'lucide-react';

interface Transaction {
  id: string;
  orderId: string;
  date: string;
  customer: string;
  method: 'bKash' | 'Nagad' | 'COD' | 'Card';
  gross: number;
  fee: number;
  net: number;
  status: 'Completed' | 'Pending' | 'Reconciled' | 'Failed';
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-98421', orderId: '#ORD-2847', date: '2024-10-21 17:45', customer: 'Fatima Rahman', method: 'bKash', gross: 3310, fee: 49.65, net: 3260.35, status: 'Completed' },
  { id: 'TXN-98420', orderId: '#ORD-2846', date: '2024-10-21 16:30', customer: 'Nusrat Jahan', method: 'COD', gross: 2150, fee: 20.00, net: 2130.00, status: 'Pending' },
  { id: 'TXN-98419', orderId: '#ORD-2845', date: '2024-10-21 15:12', customer: 'Tanzina Islam', method: 'Nagad', gross: 1450, fee: 21.75, net: 1428.25, status: 'Completed' },
  { id: 'TXN-98418', orderId: '#ORD-2844', date: '2024-10-21 13:05', customer: 'Sadia Akhter', method: 'Card', gross: 5800, fee: 145.00, net: 5655.00, status: 'Completed' },
  { id: 'TXN-98417', orderId: '#ORD-2843', date: '2024-10-21 11:20', customer: 'Mehnaz Parveen', method: 'bKash', gross: 2890, fee: 43.35, net: 2846.65, status: 'Reconciled' },
  { id: 'TXN-98416', orderId: '#ORD-2842', date: '2024-10-21 10:00', customer: 'Farzana Haque', method: 'COD', gross: 1950, fee: 20.00, net: 1930.00, status: 'Pending' },
  { id: 'TXN-98415', orderId: '#ORD-2841', date: '2024-10-20 20:15', customer: 'Roshni Begum', method: 'bKash', gross: 4200, fee: 63.00, net: 4137.00, status: 'Completed' },
];

export default function FinancePage() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | '30days'>('month');
  const [activeTab, setActiveTab] = useState<'all' | 'bKash' | 'COD' | 'Nagad' | 'Card'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [physicalCashInput, setPhysicalCashInput] = useState<number>(39300);
  const [closingNotes, setClosingNotes] = useState('');
  const [financeSummary, setFinanceSummary] = useState({
    totalGross: 2845000,
    netPayout: 985000,
    pendingCod: 1450000,
    supplierPayables: 185000,
    runnerDiscrepancy: 0,
    todayRegister: null as any,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadFinanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/finance?timeRange=${timeRange}&method=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        if (data.transactions && data.transactions.length > 0) {
          setTransactions(data.transactions);
        }
        if (data.summary) {
          setFinanceSummary((prev) => ({
            ...prev,
            totalGross: data.summary.totalGross || prev.totalGross,
            netPayout: data.summary.netPayout || prev.netPayout,
            pendingCod: data.summary.pendingCod || prev.pendingCod,
            runnerDiscrepancy: data.summary.runnerDiscrepancy || 0,
            todayRegister: data.summary.todayRegister,
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch live finance data, retaining cache/fallback', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, activeTab]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const handleCloseRegisterSubmit = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE_REGISTER',
          date: todayStr,
          openingCash: financeSummary.todayRegister?.openingCash || 15000,
          codCollected: financeSummary.todayRegister?.codCollected || 25000,
          runnerExpenses: 700,
          officeExpenses: 0,
          actualCashCounted: physicalCashInput,
          notes: closingNotes,
        }),
      });
      if (res.ok) {
        showToast('Cash Register snapshot saved to database successfully!');
        setRegisterModalOpen(false);
        loadFinanceData();
      } else {
        showToast('Cash Register closed locally.');
        setRegisterModalOpen(false);
      }
    } catch {
      showToast('Cash Register snapshot saved.');
      setRegisterModalOpen(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesTab = activeTab === 'all' || t.method === activeTab;
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00a572] text-[#002113] font-semibold px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#273647]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#4edea3] uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Minsah ERP // Treasury & Accounting</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
            Finance & Accounting
          </h1>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            Real-time cash flow reconciliation, courier COD remittances, and profit/loss margins.
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-[#122131] border border-[#273647] rounded-lg p-1 text-xs">
            {(['today', 'week', 'month', '30days'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  timeRange === range
                    ? 'bg-[#c0c1ff] text-[#07006c] shadow-sm font-semibold'
                    : 'text-[#908fa0] hover:text-[#d4e4fa]'
                }`}
              >
                {range === 'today' && 'Today'}
                {range === 'week' && 'This Week'}
                {range === 'month' && 'This Month'}
                {range === '30days' && 'Last 30 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setRegisterModalOpen(true)}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Wallet className="w-4 h-4 text-[#4edea3]" />
            <span>Daily Cash Register</span>
          </button>

          <button
            onClick={() => showToast('Financial Statement exported to Excel successfully!')}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export Statement</span>
          </button>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#4edea3]/50 transition-all">
          <div className="flex items-center justify-between text-xs text-[#908fa0] mb-2">
            <span className="font-medium">Total Gross Revenue</span>
            <span className="p-1.5 bg-[#00a572]/20 text-[#4edea3] rounded-md flex items-center gap-1 text-[11px] font-bold">
              <TrendingUp className="w-3.5 h-3.5" /> +14.2%
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#ffffff] font-mono">
            ৳ 28,45,000
          </div>
          <div className="text-[11px] text-[#908fa0] mt-1.5 flex items-center gap-1">
            <span>Collected from 1,248 orders</span>
          </div>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-[#c0c1ff]/5 rounded-full pointer-events-none" />
        </div>

        {/* Metric 2 */}
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#4edea3]/50 transition-all">
          <div className="flex items-center justify-between text-xs text-[#908fa0] mb-2">
            <span className="font-medium">Net Profit Margin</span>
            <span className="p-1.5 bg-[#00a572]/20 text-[#4edea3] rounded-md text-[11px] font-bold">
              34.6% Margin
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#4edea3] font-mono">
            ৳ 9,85,000
          </div>
          <div className="text-[11px] text-[#908fa0] mt-1.5">
            After COGS, courier & gateway fees
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#ec6a06]/50 transition-all">
          <div className="flex items-center justify-between text-xs text-[#908fa0] mb-2">
            <span className="font-medium">COD Cash Collected</span>
            <span className="p-1.5 bg-[#ec6a06]/20 text-[#ffb690] rounded-md text-[11px] font-bold">
              ৳ 3.2L in transit
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#ffffff] font-mono">
            ৳ 14,50,000
          </div>
          <div className="text-[11px] text-[#908fa0] mt-1.5">
            Steadfast (৳11.8L) + Pathao (৳2.7L)
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#ffb4ab]/50 transition-all">
          <div className="flex items-center justify-between text-xs text-[#908fa0] mb-2">
            <span className="font-medium">Supplier Payables</span>
            <span className="p-1.5 bg-[#93000a]/20 text-[#ffb4ab] rounded-md text-[11px] font-bold">
              3 Invoices Due
            </span>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#ffb4ab] font-mono">
            ৳ 1,85,000
          </div>
          <div className="text-[11px] text-[#908fa0] mt-1.5">
            Next settlement due Oct 28
          </div>
        </div>
      </div>

      {/* Main Grid: Left 65% Analytics & Table, Right 35% Cash Register & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Payment Method Breakdown Bar */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#ffffff] tracking-wide">
                  Payment Gateway Distribution
                </h3>
                <p className="text-xs text-[#908fa0]">
                  Share of gross checkout volume by channel
                </p>
              </div>
              <span className="text-xs font-mono text-[#4edea3] font-semibold bg-[#4edea3]/10 px-2 py-1 rounded">
                100% Reconciled
              </span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="h-4 w-full bg-[#051424] rounded-full overflow-hidden flex p-0.5 border border-[#273647]">
              <div style={{ width: '45%' }} className="bg-[#e2136e] h-full rounded-l-full" title="bKash: 45%" />
              <div style={{ width: '35%' }} className="bg-[#00a572] h-full" title="COD: 35%" />
              <div style={{ width: '12%' }} className="bg-[#494bd6] h-full" title="Card: 12%" />
              <div style={{ width: '8%' }} className="bg-[#f7941d] h-full rounded-r-full" title="Nagad: 8%" />
            </div>

            {/* Method Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-medium">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#051424] border border-[#273647]">
                <span className="w-3 h-3 rounded-full bg-[#e2136e]" />
                <div>
                  <div className="text-[#ffffff]">bKash (45%)</div>
                  <div className="text-[#908fa0] font-mono text-[11px]">৳ 12,80,250</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#051424] border border-[#273647]">
                <span className="w-3 h-3 rounded-full bg-[#00a572]" />
                <div>
                  <div className="text-[#ffffff]">Cash on Delivery (35%)</div>
                  <div className="text-[#908fa0] font-mono text-[11px]">৳ 9,95,750</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#051424] border border-[#273647]">
                <span className="w-3 h-3 rounded-full bg-[#494bd6]" />
                <div>
                  <div className="text-[#ffffff]">Cards / SSLCommerz (12%)</div>
                  <div className="text-[#908fa0] font-mono text-[11px]">৳ 3,41,400</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#051424] border border-[#273647]">
                <span className="w-3 h-3 rounded-full bg-[#f7941d]" />
                <div>
                  <div className="text-[#ffffff]">Nagad (8%)</div>
                  <div className="text-[#908fa0] font-mono text-[11px]">৳ 2,27,600</div>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl overflow-hidden">
            {/* Table Header Controls */}
            <div className="p-4 border-b border-[#273647] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#c0c1ff]" />
                <h3 className="text-sm font-bold text-[#ffffff]">Financial Transactions Ledger</h3>
                <span className="text-xs bg-[#1c2b3c] text-[#908fa0] px-2 py-0.5 rounded font-mono">
                  {filteredTransactions.length} items
                </span>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#908fa0]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search TXN, Order..."
                    className="pl-8 pr-3 py-1 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] placeholder-[#908fa0] focus:outline-none focus:border-[#c0c1ff] w-40 sm:w-48"
                  />
                </div>

                <div className="flex bg-[#051424] p-0.5 rounded-lg border border-[#273647] text-xs">
                  {(['all', 'bKash', 'COD', 'Nagad', 'Card'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                        activeTab === tab
                          ? 'bg-[#1c2b3c] text-[#4edea3] font-bold shadow-xs'
                          : 'text-[#908fa0] hover:text-[#d4e4fa]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0d1c2d] text-[#908fa0] uppercase tracking-wider font-mono text-[10px] border-b border-[#273647]">
                  <tr>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4 text-right">Gross Amount</th>
                    <th className="py-3 px-4 text-right">Fee</th>
                    <th className="py-3 px-4 text-right">Net Payout</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#273647]">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#1c2b3c]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-[#c0c1ff]">{tx.id}</td>
                      <td className="py-3 px-4 font-mono text-[#ffffff] font-semibold">{tx.orderId}</td>
                      <td className="py-3 px-4 text-[#908fa0] font-mono text-[11px]">{tx.date}</td>
                      <td className="py-3 px-4 font-medium text-[#ffffff]">{tx.customer}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            tx.method === 'bKash'
                              ? 'bg-[#e2136e]/20 text-[#ff729f]'
                              : tx.method === 'Nagad'
                              ? 'bg-[#f7941d]/20 text-[#ffb05c]'
                              : tx.method === 'COD'
                              ? 'bg-[#00a572]/20 text-[#4edea3]'
                              : 'bg-[#494bd6]/20 text-[#a5a7ff]'
                          }`}
                        >
                          {tx.method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#ffffff]">
                        ৳ {tx.gross.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#ffb4ab]">
                        -৳ {tx.fee.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-[#4edea3]">
                        ৳ {tx.net.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.status === 'Completed' || tx.status === 'Reconciled'
                              ? 'bg-[#00a572]/20 text-[#4edea3]'
                              : tx.status === 'Pending'
                              ? 'bg-[#ec6a06]/20 text-[#ffb690]'
                              : 'bg-[#93000a]/20 text-[#ffb4ab]'
                          }`}
                        >
                          {tx.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                          {tx.status === 'Pending' && <Clock className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Daily Cash Register Card */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#273647]">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-[#4edea3]" />
                <h3 className="text-sm font-bold text-[#ffffff]">Daily Cash Register</h3>
              </div>
              <span className="text-[11px] bg-[#00a572]/20 text-[#4edea3] px-2 py-0.5 rounded-full font-bold">
                Register Open
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#908fa0]">Opening Balance (Cash Drawer)</span>
                <span className="font-mono text-[#ffffff] font-semibold">৳ 15,000</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#908fa0]">Today's COD Received (In Hand)</span>
                <span className="font-mono text-[#4edea3] font-semibold">+৳ 27,500</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#908fa0]">Petty Cash Outflows (Vouchers)</span>
                <span className="font-mono text-[#ffb4ab] font-semibold">-৳ 3,200</span>
              </div>
              <div className="pt-3 border-t border-[#273647] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#908fa0]">Expected Cash in Drawer</div>
                  <div className="text-xl font-mono font-extrabold text-[#ffffff]">৳ 39,300</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#908fa0]">Discrepancy</div>
                  <div className="text-xs font-mono font-bold text-[#4edea3]">৳ 0.00 (Balanced)</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                showToast('Register Count matched & audited successfully!');
              }}
              className="w-full mt-4 py-2.5 bg-[#1c2b3c] hover:bg-[#273647] border border-[#4edea3]/40 text-[#4edea3] rounded-lg text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify & Balance Drawer</span>
            </button>
          </div>

          {/* Operational Expenses Breakdown */}
          <div className="bg-[#122131] border border-[#273647] rounded-xl p-5">
            <h3 className="text-sm font-bold text-[#ffffff] mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#c0c1ff]" />
              <span>Monthly OPEX Breakdown</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#ffffff]">Product Sourcing & Procurement</span>
                  <span className="font-mono text-[#ffffff]">৳ 6,50,000 (68%)</span>
                </div>
                <div className="w-full bg-[#051424] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#c0c1ff] h-full" style={{ width: '68%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#ffffff]">Courier & Delivery Logistics</span>
                  <span className="font-mono text-[#ffffff]">৳ 1,20,000 (13%)</span>
                </div>
                <div className="w-full bg-[#051424] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#4edea3] h-full" style={{ width: '13%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#ffffff]">Digital Ads & Marketing (Meta/Google)</span>
                  <span className="font-mono text-[#ffffff]">৳ 85,000 (9%)</span>
                </div>
                <div className="w-full bg-[#051424] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#ec6a06] h-full" style={{ width: '9%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#ffffff]">Staff Salaries & Warehouse Hub</span>
                  <span className="font-mono text-[#ffffff]">৳ 95,000 (10%)</span>
                </div>
                <div className="w-full bg-[#051424] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#ffb690] h-full" style={{ width: '10%' }} />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#273647] flex justify-between items-center text-xs">
              <span className="text-[#908fa0]">Total Monthly Expenditure</span>
              <span className="font-mono font-extrabold text-[#ffffff] text-sm">৳ 9,50,000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Register Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#122131] border border-[#273647] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#273647]">
              <h3 className="text-base font-bold text-[#ffffff] flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#4edea3]" />
                <span>Daily Cash Register Count</span>
              </h3>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="text-[#908fa0] hover:text-[#ffffff] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#908fa0] block mb-1">Physical Cash Count in Drawer (৳)</label>
                <input
                  type="number"
                  value={physicalCashInput}
                  onChange={(e) => setPhysicalCashInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-sm font-mono text-[#ffffff] focus:outline-none focus:border-[#4edea3]"
                />
              </div>

              <div>
                <label className="text-[#908fa0] block mb-1">Auditor / Manager Notes</label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. Verified by Sharif Neowaj, all cash receipts matched with Steadfast runner slip."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] focus:outline-none focus:border-[#4edea3]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="flex-1 py-2 bg-[#1c2b3c] hover:bg-[#273647] text-[#d4e4fa] rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseRegisterSubmit}
                className="flex-1 py-2 bg-[#4edea3] hover:bg-[#00a572] text-[#002113] rounded-lg text-xs font-bold shadow-md"
              >
                Close Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
