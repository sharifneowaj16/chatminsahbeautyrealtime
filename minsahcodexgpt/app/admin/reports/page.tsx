'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  BarChart3,
  Package,
  Users,
  Truck,
  FileCheck2,
  TrendingUp,
  Clock,
  CheckCircle2,
  Filter,
  FileText,
  Search,
  Share2,
  HardDrive
} from 'lucide-react';

interface ReportSuite {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  formats: ('Excel' | 'CSV' | 'PDF')[];
  lastGenerated: string;
  category: string;
}

interface ExportHistoryItem {
  id: string;
  filename: string;
  format: 'Excel' | 'CSV' | 'PDF';
  size: string;
  generatedAt: string;
  records: number;
}

const REPORT_SUITES: ReportSuite[] = [
  {
    id: 'sales-revenue',
    title: 'Sales & Revenue Financial Analytics',
    description: 'Daily order volumes, gross sales, gross margins, discounts, and AOV breakdown.',
    icon: TrendingUp,
    formats: ['Excel', 'PDF'],
    lastGenerated: 'Today, 14:00',
    category: 'Finance'
  },
  {
    id: 'inventory-deadstock',
    title: 'Inventory Valuation & Dead Stock Audit',
    description: 'Current warehouse asset value, fast vs slow moving SKUs, reorder point alerts.',
    icon: Package,
    formats: ['Excel', 'CSV'],
    lastGenerated: 'Yesterday',
    category: 'Logistics'
  },
  {
    id: 'customer-cohort',
    title: 'Customer Lifetime Value (LTV) & Cohorts',
    description: 'Repeat purchase frequency, customer acquisition cost, VIP retention benchmarks.',
    icon: Users,
    formats: ['Excel', 'PDF'],
    lastGenerated: '3 days ago',
    category: 'Marketing'
  },
  {
    id: 'courier-sla',
    title: 'Courier Delivery SLA & COD Performance',
    description: 'Steadfast vs Pathao success rates, delivery duration, return rate (RTO) breakdown.',
    icon: Truck,
    formats: ['Excel', 'CSV'],
    lastGenerated: 'Today, 09:30',
    category: 'Logistics'
  },
  {
    id: 'tax-vat',
    title: 'Tax & VAT Compliance Ledger (NBR Form 9.1)',
    description: 'Auditable sales and input tax credit calculation report ready for NBR submission.',
    icon: FileCheck2,
    formats: ['PDF', 'Excel'],
    lastGenerated: 'Oct 15, 2024',
    category: 'Compliance'
  },
  {
    id: 'marketing-roas',
    title: 'Meta & Digital Ads Attribution ROAS',
    description: 'Meta CAPI, TikTok, Google ad spend vs verified purchase conversion value.',
    icon: BarChart3,
    formats: ['Excel', 'PDF'],
    lastGenerated: '2 days ago',
    category: 'Marketing'
  }
];

const INITIAL_EXPORTS: ExportHistoryItem[] = [
  { id: 'EXP-101', filename: 'Minsah_Sales_Report_Oct2024.xlsx', format: 'Excel', size: '245 KB', generatedAt: '2024-10-21 14:00', records: 1248 },
  { id: 'EXP-100', filename: 'Steadfast_Logistics_SLA_Q3.csv', format: 'CSV', size: '128 KB', generatedAt: '2024-10-21 09:30', records: 840 },
  { id: 'EXP-099', filename: 'Inventory_Asset_Valuation.xlsx', format: 'Excel', size: '312 KB', generatedAt: '2024-10-20 18:20', records: 412 },
  { id: 'EXP-098', filename: 'NBR_VAT_Monthly_Calculation.pdf', format: 'PDF', size: '512 KB', generatedAt: '2024-10-15 11:00', records: 1250 },
  { id: 'EXP-097', filename: 'VIP_Customer_Retention_List.csv', format: 'CSV', size: '94 KB', generatedAt: '2024-10-14 16:45', records: 320 }
];

export default function ReportsExportPage() {
  const [dateRange, setDateRange] = useState('This Month (Oct 1 - Oct 31, 2024)');
  const [history, setHistory] = useState<ExportHistoryItem[]>(INITIAL_EXPORTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleGenerateReport = (suite: ReportSuite, format: string) => {
    const newExport: ExportHistoryItem = {
      id: `EXP-${Math.floor(Math.random() * 900 + 100)}`,
      filename: `${suite.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${format === 'Excel' ? 'xlsx' : format.toLowerCase()}`,
      format: format as any,
      size: `${Math.floor(Math.random() * 200 + 100)} KB`,
      generatedAt: 'Just now',
      records: 1248
    };
    setHistory([newExport, ...history]);
    showToast(`Generating ${suite.title} in ${format} format... Ready to download!`);
  };

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
            <FileSpreadsheet className="w-4 h-4" />
            <span>Minsah BI // Business Intelligence & Reporting Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
            Reports & Export Center
          </h1>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            Download auditable Excel spreadsheets, CSV data feeds, and compliance PDF statements.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#122131] border border-[#273647] rounded-lg px-3 py-1.5 text-xs text-[#ffffff]">
            <Calendar className="w-4 h-4 text-[#c0c1ff]" />
            <span>{dateRange}</span>
          </div>

          <button
            onClick={() => showToast('Weekly automated email reports configured for admin!')}
            className="px-3.5 py-2 bg-[#1c2b3c] hover:bg-[#273647] border border-[#464554] text-[#d4e4fa] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Clock className="w-4 h-4 text-[#4edea3]" />
            <span>Schedule Automated Report</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Generated This Month</span>
            <FileSpreadsheet className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">142</div>
          <div className="text-[11px] text-[#4edea3] mt-1 font-medium">+24% vs last month</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Records Exported</span>
            <BarChart3 className="w-4 h-4 text-[#4edea3]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">86,500</div>
          <div className="text-[11px] text-[#908fa0] mt-1">Zero data leaks detected</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Scheduled Crons</span>
            <Clock className="w-4 h-4 text-[#ffb690]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffb690] font-mono">6 Active</div>
          <div className="text-[11px] text-[#908fa0] mt-1">Daily & Weekly auto-digest</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Storage Archive</span>
            <HardDrive className="w-4 h-4 text-[#ffb4ab]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">1.4 GB / 10 GB</div>
          <div className="text-[11px] text-[#4edea3] mt-1">Encrypted cold storage</div>
        </div>
      </div>

      {/* Main Grid: Left 65% Report Suites, Right 35% Export History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Report Suites Cards */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-sm font-bold text-[#ffffff] flex items-center justify-between">
            <span>Available Report Suites</span>
            <span className="text-xs text-[#908fa0] font-mono">6 Intelligence Templates</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REPORT_SUITES.map((suite) => {
              const IconComp = suite.icon;
              return (
                <div
                  key={suite.id}
                  className="bg-[#122131] border border-[#273647] hover:border-[#c0c1ff]/50 rounded-xl p-5 space-y-3 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-lg bg-[#051424] border border-[#273647] text-[#c0c1ff]">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1c2b3c] text-[#908fa0] uppercase tracking-wider font-mono">
                        {suite.category}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-[#ffffff]">{suite.title}</h3>
                    <p className="text-xs text-[#908fa0] leading-relaxed">{suite.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#273647] flex items-center justify-between">
                    <span className="text-[11px] text-[#908fa0]">Last: {suite.lastGenerated}</span>
                    <div className="flex items-center gap-1.5">
                      {suite.formats.map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => handleGenerateReport(suite, fmt)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all active:scale-95 ${
                            fmt === 'Excel'
                              ? 'bg-[#00a572]/20 hover:bg-[#00a572]/40 text-[#4edea3]'
                              : fmt === 'CSV'
                              ? 'bg-[#c0c1ff]/20 hover:bg-[#c0c1ff]/40 text-[#c0c1ff]'
                              : 'bg-[#93000a]/20 hover:bg-[#93000a]/40 text-[#ffb4ab]'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (4 cols): Recent Downloads History */}
        <div className="lg:col-span-4 bg-[#122131] border border-[#273647] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#273647]">
            <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
              <Download className="w-4 h-4 text-[#4edea3]" />
              <span>Download History</span>
            </h3>
            <span className="text-xs font-mono text-[#908fa0]">{history.length} Files</span>
          </div>

          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-[#051424] border border-[#273647] hover:border-[#4edea3]/40 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-[#ffffff] truncate" title={item.filename}>
                    {item.filename}
                  </div>
                  <div className="text-[10px] text-[#908fa0] font-mono mt-0.5 flex items-center gap-2">
                    <span
                      className={`font-bold ${
                        item.format === 'Excel'
                          ? 'text-[#4edea3]'
                          : item.format === 'CSV'
                          ? 'text-[#c0c1ff]'
                          : 'text-[#ffb4ab]'
                      }`}
                    >
                      {item.format}
                    </span>
                    <span>•</span>
                    <span>{item.size}</span>
                    <span>•</span>
                    <span>{item.records} rows</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    showToast(`Downloading ${item.filename}...`);
                    window.open('/api/admin/reports?type=sales-csv', '_blank');
                  }}
                  className="p-2 hover:bg-[#1c2b3c] text-[#4edea3] hover:text-[#ffffff] rounded-lg transition-colors shrink-0"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => showToast('All old archived exports purged')}
            className="w-full py-2 bg-[#051424] hover:bg-[#1c2b3c] border border-[#273647] text-[#908fa0] hover:text-[#ffffff] rounded-lg text-xs font-medium transition-all"
          >
            Clear Download Cache
          </button>
        </div>
      </div>
    </div>
  );
}
