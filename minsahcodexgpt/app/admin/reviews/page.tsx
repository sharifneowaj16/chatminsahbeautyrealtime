'use client';




import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  Search,
  Star,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
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
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: '1',
      product: 'Luxury Foundation Pro',
      customer: 'Sarah Johnson',
      rating: 5,
      title: 'Amazing Product!',
      content: 'This product exceeded my expectations...',
      status: 'approved',
      createdAt: '2024-01-20',
    },
    {
      id: '2',
      product: 'Organic Face Serum',
      customer: 'Emma Davis',
      rating: 4,
      title: 'Good but could be better',
      content: 'Overall satisfied with the product...',
      status: 'pending',
      createdAt: '2024-01-19',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (!hasPermission(PERMISSIONS.CONTENT_MANAGE)) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">No permission</p></div>;
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
        <div className="bg-[#151516] rounded-xl border border-white/[0.08] p-4 shadow-sm">
          <p className="text-sm text-[#8A8F98]">Total Reviews</p>
          <p className="text-2xl font-bold text-[#F7F8F8]">{reviews.length}</p>
        </div>
        <div className="bg-[#151516] rounded-xl border border-white/[0.08] p-4 shadow-sm">
          <p className="text-sm text-[#8A8F98]">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{reviews.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="bg-[#151516] rounded-xl border border-white/[0.08] p-4 shadow-sm">
          <p className="text-sm text-[#8A8F98]">Approved</p>
          <p className="text-2xl font-bold text-green-600">{reviews.filter(r => r.status === 'approved').length}</p>
        </div>
      </div>

      <div className="bg-[#151516] rounded-xl border border-white/[0.08] p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-white/[0.08] bg-[#08090A] text-[#F7F8F8] placeholder-[#62666D] rounded-lg focus:ring-1 focus:ring-white/20"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-white/[0.08] bg-[#08090A] text-[#F7F8F8] rounded-lg focus:ring-1 focus:ring-white/20">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </div>

      <div className="bg-[#151516] rounded-xl border border-white/[0.08] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-[#08090A]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Review</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#8A8F98] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {filteredReviews.map((review) => (
              <tr key={review.id} className="hover:bg-[#1C1D1F]/70 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-[#F7F8F8]">{review.product}</td>
                <td className="px-6 py-4 text-sm text-[#8A8F98]">{review.customer}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
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
                    review.status === 'approved' ? 'bg-green-100 text-green-800' :
                    review.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  )}>{review.status}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    {review.status === 'pending' && (
                      <>
                        <Button className="text-green-600"><CheckCircle className="w-4 h-4" /></Button>
                        <Button className="text-red-600"><XCircle className="w-4 h-4" /></Button>
                      </>
                    )}
                    <Button className="text-blue-600"><Eye className="w-4 h-4" /></Button>
                    <Button className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
