'use client'



import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext'
import { RefreshCw, Package, AlertCircle, CheckCircle2 } from 'lucide-react'

type WebhookEventRow = {
  id: string
  eventType: string
  invoice: string | null
  consignmentId: string | null
  trackingCode: string | null
  status: string | null
  trackingMessage: string | null
  processingStatus: string
  receivedAt: string
  processedAt: string | null
  orderId: string | null
  orderNumber: string | null
  error: string | null
}

export default function SteadfastWebhooksPage() {
  const { hasPermission, isLoading } = useAdminAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [events, setEvents] = useState<WebhookEventRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPage = useCallback(
    async (opts: { append: boolean; cursor?: string | null }) => {
      setError(null)
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('limit', '40')
        if (statusFilter) {
          params.set('status', statusFilter)
        }
        if (opts.cursor) {
          params.set('cursor', opts.cursor)
        }
        const res = await fetch(`/api/admin/shipping/steadfast/webhook-events?${params}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        const data = (await res.json()) as {
          events?: WebhookEventRow[]
          nextCursor?: string | null
          error?: string
        }
        if (!res.ok) {
          setError(data.error ?? 'Failed to load webhook events')
          return
        }
        const list = data.events ?? []
        setEvents((prev) => (opts.append ? [...prev, ...list] : list))
        setNextCursor(data.nextCursor ?? null)
      } catch {
        setError('Network error while loading events')
      } finally {
        setLoading(false)
      }
    },
    [statusFilter]
  )

  useEffect(() => {
    if (isLoading || !hasPermission(PERMISSIONS.ORDERS_VIEW)) {
      return
    }
    void loadPage({ append: false })
  }, [hasPermission, isLoading, loadPage])

  const canView = hasPermission(PERMISSIONS.ORDERS_VIEW)

  if (!isLoading && !canView) {
    return (
      <div className="p-8">
        <p className="text-[#8a8f98]">You do not have permission to view shipping webhooks.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F7F8F8]">Steadfast webhooks</h1>
            <p className="mt-1 text-sm text-[#8A8F98]">
              Courier delivery and tracking callbacks received at{' '}
              <code className="rounded bg-[#10121b] border border-[#232636] px-1.5 py-0.5 text-xs text-[#F7F8F8]">/api/webhook/steadfast</code>
              . Raw payloads are not listed here for security.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#232636] bg-[#161824] text-[#F7F8F8] px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="PROCESSED">Processed</option>
              <option value="NO_ORDER_FOUND">No order match</option>
              <option value="RECEIVED">Received</option>
            </Select>
            <Button
              type="button"
              onClick={() => void loadPage({ append: false })}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[#232636] bg-[#161824] px-4 py-2 text-sm font-medium text-[#F7F8F8] hover:bg-[#1b1e2c] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-[#232636] bg-[#161824] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#232636] text-sm">
              <thead className="bg-[#10121b]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Received</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Order</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Courier</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Message</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#8A8F98]">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232636]">
                {events.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#8A8F98]">
                      No webhook events yet. After Steadfast sends callbacks, they will appear here.
                    </td>
                  </tr>
                ) : (
                  events.map((e) => (
                    <tr key={e.id} className="hover:bg-[#1b1e2c]/70 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-[#8A8F98]">
                        {new Date(e.receivedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#F7F8F8]">{e.eventType}</td>
                      <td className="px-4 py-3">
                        {e.orderNumber ? (
                          <Link
                            href={`/admin/orders?search=${encodeURIComponent(e.orderNumber)}`}
                            className="font-mono text-white hover:text-[#FFFFFF] hover:underline"
                          >
                            {e.orderNumber}
                          </Link>
                        ) : (
                          <span className="text-[#62666D]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#F7F8F8]">
                        <div className="space-y-0.5">
                          {e.status && <div>Status: {e.status}</div>}
                          {e.consignmentId && (
                            <div className="font-mono text-xs text-[#8A8F98]">CID {e.consignmentId}</div>
                          )}
                          {e.trackingCode && (
                            <div className="font-mono text-xs text-[#8A8F98]">{e.trackingCode}</div>
                          )}
                        </div>
                      </td>
                      <td className="max-w-md px-4 py-3 text-[#8A8F98]">
                        {e.trackingMessage ? (
                          <span className="line-clamp-2">{e.trackingMessage}</span>
                        ) : (
                          <span className="text-[#62666d]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            e.processingStatus === 'PROCESSED'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : e.processingStatus === 'NO_ORDER_FOUND'
                                ? 'bg-amber-500/10 text-amber-900'
                                : 'bg-[#10121b] text-[#d0d6e0]'
                          }`}
                        >
                          {e.processingStatus === 'PROCESSED' && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {e.processingStatus}
                        </span>
                        {e.error && (
                          <p className="mt-1 text-xs text-red-600 line-clamp-2">{e.error}</p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {nextCursor && (
          <div className="flex justify-center">
            <Button
              type="button"
              disabled={loading}
              onClick={() => void loadPage({ append: true, cursor: nextCursor })}
              className="rounded-lg bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] px-4 py-2 text-sm font-medium text-white hover:bg-white/90 disabled:opacity-50"
            >
              Load more
            </Button>
          </div>
        )}

        <div className="rounded-lg border border-[#232636] bg-[#161824] p-4 text-sm text-[#F7F8F8]">
          <div className="flex items-start gap-2">
            <Package className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Security</p>
              <p className="mt-1 text-[#8A8F98]">
                Set <code className="rounded bg-[#10121b] border border-[#232636] px-1 text-[#F7F8F8]">STEADFAST_WEBHOOK_SECRET</code> and/or{' '}
                <code className="rounded bg-[#10121b] border border-[#232636] px-1 text-[#F7F8F8]">STEADFAST_WEBHOOK_CUSTOMER_KEY</code> +{' '}
                <code className="rounded bg-[#10121b] border border-[#232636] px-1 text-[#F7F8F8]">STEADFAST_WEBHOOK_AUTHORIZATION</code> on the server.
                The webhook rejects requests until at least one credential is configured.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
