'use client';




import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Search,
  Star,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';

interface Review {
  id: string;
  product: string;
  customer: string;
  rating: number;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function ReviewsManagementPage() {
  const { hasPermission } = useAdminAuth();
  const { pushToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reviews', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch reviews');
      }
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err: any) {
      setError(err?.message || 'Error loading reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleUpdateStatus = async (reviewId: string, newStatus: 'approved' | 'rejected') => {
    const previousReviews = [...reviews];
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r))
    );

    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${newStatus === 'approved' ? 'approve' : 'reject'} review`);
      }
      pushToast({
        tone: 'success',
        description: `Review marked as ${newStatus}`,
      });
    } catch (err: any) {
      setReviews(previousReviews);
      pushToast({
        tone: 'danger',
        description: err?.message || 'Failed to update review',
      });
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (!hasPermission(PERMISSIONS.CONTENT_MANAGE)) {
    return <div className="flex items-center justify-center h-64"><p className="text-[#8a8f98]">No permission</p></div>;
  }

  const filteredReviews = reviews.filter(r => {
    const matchesSearch = r.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F7F8F8]">Reviews Management</h1>
          <p className="text-sm text-[#8A8F98]">Moderate product reviews</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161824] rounded-xl border border-[#232636] p-4 shadow-sm">
          <p className="text-sm text-[#8A8F98]">Total Reviews</p>
          <p className="text-2xl font-bold text-[#F7F8F8]">{reviews.length}</p>
        </div>
        <div className="bg-[#161824] rounded-xl border border-[#232636] p-4 shadow-sm">
          <p className="text-sm text-[#8A8F98]">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{reviews.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="bg-[#161824] rounded-xl border border-[#232636] p-4 shadow-sm">
          <p className="text-sm text-[#8A8F98]">Approved</p>
          <p className="text-2xl font-bold text-green-600">{reviews.filter(r => r.status === 'approved').length}</p>
        </div>
      </div>

      <div className="bg-[#161824] rounded-xl border border-[#232636] p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#62666d]" />
            <Input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] placeholder-[#62666D] rounded-lg focus:ring-1 focus:ring-white/20"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-[#232636] bg-[#10121b] text-[#F7F8F8] rounded-lg focus:ring-1 focus:ring-white/20">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/70 border border-red-800/40 text-red-300 px-4 py-3 rounded-xl mb-6 text-sm flex justify-between items-center">
          <span>{error}</span>
          <Button onClick={fetchReviews} className="text-xs px-3 py-1 bg-red-800/50 hover:bg-red-700/50 text-white rounded">Retry</Button>
        </div>
      )}

      <div className="bg-[#161824] rounded-xl border border-[#232636] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-[#10121b]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Review</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232636]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-[#8A8F98]">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#5e6ad2]" />
                  <p className="text-xs">Loading reviews...</p>
                </td>
              </tr>
            ) : filteredReviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-[#8A8F98]">
                  <p className="text-sm">No reviews found</p>
                </td>
              </tr>
            ) : (
              filteredReviews.map((review) => (
                <tr key={review.id} className="hover:bg-[#1b1e2c]/70 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-[#F7F8F8]">{review.product}</td>
                <td className="px-6 py-4 text-sm text-[#8A8F98]">{review.customer}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-[#d0d6e0]'}`} />
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-[#F7F8F8]">{review.title}</div>
                  <div className="text-xs text-[#8A8F98]">{review.content.substring(0, 50)}...</div>
                </td>
                <td className="px-6 py-4">
                  <span className={clsx(
                    'px-2 py-1 rounded-full text-xs',
                    review.status === 'approved' ? 'bg-emerald-500/10 text-emerald-300' :
                    review.status === 'pending' ? 'bg-amber-500/10 text-amber-300' :
                    'bg-red-100 text-rose-300'
                  )}>{review.status}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {review.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleUpdateStatus(review.id, 'approved')}
                          className="text-green-600 hover:text-green-400 p-1"
                          title="Approve Review"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleUpdateStatus(review.id, 'rejected')}
                          className="text-red-600 hover:text-red-400 p-1"
                          title="Reject Review"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button className="text-[#5e6ad2]"><Eye className="w-4 h-4" /></Button>
                    <Button className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
