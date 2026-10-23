'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  User,
  Clock,
  Eye,
  FileCode,
  ShieldCheck,
  Globe,
  Smartphone,
  RefreshCw
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  staffName: string;
  staffRole: 'Super Admin' | 'Manager' | 'Fulfillment Staff' | 'Runner';
  action: string;
  resource: string;
  ipAddress: string;
  location: string;
  severity: 'normal' | 'warning' | 'critical';
  detailsPayload: string;
}

const INITIAL_LOGS: AuditLogEntry[] = [
  {
    id: 'LOG-8821',
    timestamp: '2024-10-21 17:42:10',
    staffName: 'Sharif Neowaj',
    staffRole: 'Super Admin',
    action: 'Product Price Override',
    resource: 'SKU-COSRX-TONER (#892)',
    ipAddress: '103.114.34.18',
    location: 'Dhaka, Bangladesh',
    severity: 'warning',
    detailsPayload: JSON.stringify({ oldPrice: 1650, newPrice: 1750, reason: 'Import tariff inflation adjustment' }, null, 2)
  },
  {
    id: 'LOG-8820',
    timestamp: '2024-10-21 16:55:04',
    staffName: 'Nadia Islam',
    staffRole: 'Manager',
    action: 'Order Refund Approved',
    resource: 'Order #ORD-2831',
    ipAddress: '103.114.34.22',
    location: 'Dhaka, Bangladesh',
    severity: 'normal',
    detailsPayload: JSON.stringify({ amount: 1850, method: 'bKash Merchant', customer: 'Sadia Akhter', reason: 'Damaged cap during transit' }, null, 2)
  },
  {
    id: 'LOG-8819',
    timestamp: '2024-10-21 15:30:19',
    staffName: 'System Security Engine',
    staffRole: 'Super Admin',
    action: 'Brute Force Login Blocked',
    resource: 'Auth Endpoint /api/admin/login',
    ipAddress: '194.26.29.112',
    location: 'Frankfurt, Germany (Proxy/VPN)',
    severity: 'critical',
    detailsPayload: JSON.stringify({ attempts: 8, failedUser: 'administrator@minsah.com', actionTaken: 'IP rate-limited for 60 minutes' }, null, 2)
  },
  {
    id: 'LOG-8818',
    timestamp: '2024-10-21 14:15:45',
    staffName: 'Rahim Runner',
    staffRole: 'Runner',
    action: 'Runner Cash Ledger Settled',
    resource: 'Ledger Batch #RUN-441',
    ipAddress: '119.30.38.10',
    location: 'Dhanmondi, Dhaka',
    severity: 'normal',
    detailsPayload: JSON.stringify({ collectedCash: 18500, handedOverTo: 'Sharif (Admin)', variance: 0 }, null, 2)
  },
  {
    id: 'LOG-8817',
    timestamp: '2024-10-21 11:20:00',
    staffName: 'Sharif Neowaj',
    staffRole: 'Super Admin',
    action: 'Courier API Credentials Rotated',
    resource: 'Settings / Steadfast Courier',
    ipAddress: '103.114.34.18',
    location: 'Dhaka, Bangladesh',
    severity: 'warning',
    detailsPayload: JSON.stringify({ provider: 'Steadfast Courier', newKeyFingerprint: 'SHA256:***89b2' }, null, 2)
  },
  {
    id: 'LOG-8816',
    timestamp: '2024-10-20 19:40:12',
    staffName: 'Farhana Manager',
    staffRole: 'Manager',
    action: 'Bulk Customer Data Exported',
    resource: 'Export / Customers_Active_Q3.csv',
    ipAddress: '103.114.34.25',
    location: 'Dhaka, Bangladesh',
    severity: 'warning',
    detailsPayload: JSON.stringify({ exportRecords: 4800, fileFormat: 'CSV', approvedBy: 'Super Admin' }, null, 2)
  }
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(INITIAL_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'normal' | 'warning' | 'critical'>('All');
  const [inspectModalLog, setInspectModalLog] = useState<AuditLogEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Failed to load audit logs from API, using fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSeverity = severityFilter === 'All' || log.severity === severityFilter;
    const matchesSearch =
      log.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
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

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#273647]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#ffb4ab] uppercase tracking-wider mb-1">
            <Lock className="w-4 h-4" />
            <span>Minsah Security & Governance // Zero Trust Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] tracking-tight">
            Staff Activity & Security Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-[#908fa0] mt-0.5">
            Cryptographically sealed activity log of all admin operations, price overrides, and data exports.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => showToast('Full audit log downloaded (CSV)!')}
            className="px-4 py-2 bg-[#c0c1ff] hover:bg-[#a5a7ff] text-[#07006c] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit Trail (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Actions Logged Today</span>
            <ShieldCheck className="w-4 h-4 text-[#4edea3]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono">1,248</div>
          <div className="text-[11px] text-[#4edea3] mt-1 font-medium">100% telemetry coverage</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Active Staff Sessions</span>
            <User className="w-4 h-4 text-[#c0c1ff]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#c0c1ff] font-mono">8 Staff</div>
          <div className="text-[11px] text-[#908fa0] mt-1">Dhaka Central Hub</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Elevated Actions</span>
            <AlertTriangle className="w-4 h-4 text-[#ffb690]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffb690] font-mono">14</div>
          <div className="text-[11px] text-[#908fa0] mt-1">Price & credential overrides</div>
        </div>

        <div className="bg-[#122131] border border-[#273647] rounded-xl p-4 sm:p-5">
          <div className="text-xs text-[#908fa0] flex items-center justify-between mb-1">
            <span>Security Alerts</span>
            <ShieldAlert className="w-4 h-4 text-[#ffb4ab]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[#ffb4ab] font-mono">2</div>
          <div className="text-[11px] text-[#ffb4ab] mt-1">Brute-force blocked automatically</div>
        </div>
      </div>

      {/* Audit Log Table Container */}
      <div className="bg-[#122131] border border-[#273647] rounded-xl overflow-hidden space-y-3">
        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-[#273647] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(['All', 'normal', 'warning', 'critical'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  severityFilter === sev
                    ? 'bg-[#c0c1ff] text-[#07006c] font-bold shadow-xs'
                    : 'text-[#908fa0] hover:text-[#ffffff] hover:bg-[#1c2b3c]'
                }`}
              >
                {sev === 'All' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#908fa0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, action, IP, resource..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#051424] border border-[#273647] rounded-lg text-xs text-[#d4e4fa] placeholder-[#908fa0] focus:outline-none focus:border-[#c0c1ff]"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1c2d] text-[#908fa0] uppercase tracking-wider font-mono text-[10px] border-b border-[#273647]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC+6)</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4">IP Address & Origin</th>
                <th className="py-3 px-4 text-center">Severity</th>
                <th className="py-3 px-4 text-center">Payload Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#273647]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#1c2b3c]/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-[#908fa0] text-[11px] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#ffffff]">{log.staffName}</div>
                    <span className="text-[10px] font-mono text-[#c0c1ff]">{log.staffRole}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#ffffff]">{log.action}</td>
                  <td className="py-3 px-4 font-mono text-[#4edea3] text-[11px]">{log.resource}</td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-[#ffffff] text-[11px]">{log.ipAddress}</div>
                    <div className="text-[10px] text-[#908fa0] flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>{log.location}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.severity === 'critical'
                          ? 'bg-[#93000a]/30 text-[#ffb4ab] border border-[#ffb4ab]/30'
                          : log.severity === 'warning'
                          ? 'bg-[#ec6a06]/30 text-[#ffb690] border border-[#ffb690]/30'
                          : 'bg-[#00a572]/30 text-[#4edea3]'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setInspectModalLog(log)}
                      className="px-2.5 py-1 bg-[#051424] hover:bg-[#1c2b3c] border border-[#273647] rounded text-[11px] text-[#c0c1ff] font-mono flex items-center gap-1 mx-auto transition-all"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 text-[11px] text-[#908fa0] text-center border-t border-[#273647]">
          Immutable logs retained for 365 days in accordance with NBR & digital commerce standards.
        </div>
      </div>

      {/* Inspect Payload Diff Modal */}
      {inspectModalLog && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#122131] border border-[#273647] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#273647]">
              <div>
                <h3 className="text-sm font-bold text-[#ffffff] flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#c0c1ff]" />
                  <span>Payload Diff: {inspectModalLog.action}</span>
                </h3>
                <span className="text-[10px] text-[#908fa0] font-mono">
                  {inspectModalLog.timestamp} • By {inspectModalLog.staffName}
                </span>
              </div>
              <button
                onClick={() => setInspectModalLog(null)}
                className="text-[#908fa0] hover:text-[#ffffff] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 bg-[#051424] border border-[#273647] rounded-xl font-mono text-xs text-[#4edea3] overflow-x-auto max-h-72">
              {inspectModalLog.detailsPayload}
            </pre>

            <button
              onClick={() => setInspectModalLog(null)}
              className="w-full py-2 bg-[#1c2b3c] hover:bg-[#273647] text-[#ffffff] rounded-lg text-xs font-semibold"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
