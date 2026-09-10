'use client';

// app/admin/shortlist/components/SearchFilterBar.tsx

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import React, { useState } from 'react';
import { useShortlist } from '../ShortlistContext';

export default function SearchFilterBar() {
  const { filters, setFilters } = useShortlist();
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ searchQuery: e.target.value });
  };

  const handleStatusChange = (status: 'pending' | 'completed') => {
    setFilters({ status });
  };

  const handlePriorityChange = (priority: string) => {
    setFilters({ priority });
  };

  const handleDateRangeChange = (dateRange: 'today' | 'week' | 'all') => {
    setFilters({ dateRange });
  };

  const handleSortChange = (sortBy: 'recent' | 'urgent' | 'progress') => {
    setFilters({ sortBy });
  };

  return (
    <div className="bg-[#161824] border border-[#232636] rounded-xl shadow-sm">
      <div className="p-4 sm:p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Input
            type="text"
            placeholder="🔍 Search by order #, customer name, or phone..."
            value={filters.searchQuery}
            onChange={handleSearch}
            className="w-full px-4 py-3 pl-10 border border-[#232636] bg-[#10121b] text-[#F7F8F8] placeholder-[#62666D] rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm sm:text-base"
          />
          <span className="absolute left-3 top-3.5 text-[#62666D]">🔍</span>
        </div>

        {/* Filter Toggle Button */}
        <Button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full sm:w-auto px-4 py-2 bg-[rgba(255,255,255,0.08)] border border-white/[0.15] text-[#F7F8F8] rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[rgba(255,255,255,0.15)] transition-colors"
        >
          <span>⚙️ Filters</span>
          <span className="text-lg">{showFilters ? '▼' : '▶'}</span>
        </Button>

        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-[#232636]">
            {/* Status Filter */}
            <div>
              <p className="text-sm font-semibold text-[#8A8F98] mb-2">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {['pending', 'completed'].map((status) => (
                  <Button
                    key={status}
                    onClick={() => handleStatusChange(status as 'pending' | 'completed')}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.status === status ? 'bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] shadow-md' : 'bg-[#10121b] border border-[#232636] text-[#8A8F98] hover:bg-[#1b1e2c] hover:text-[#F7F8F8]'
                    }`}
                  >
                    {status === 'pending' ? '⏳ Pending' : '✅ Completed'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <p className="text-sm font-semibold text-[#8A8F98] mb-2">Priority</p>
              <div className="grid grid-cols-2 gap-2">
                {['ALL', 'URGENT', 'NORMAL', 'LOW_PRIORITY'].map((priority) => (
                  <Button
                    key={priority}
                    onClick={() => handlePriorityChange(priority)}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.priority === priority ? 'bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] shadow-md' : 'bg-[#10121b] border border-[#232636] text-[#8A8F98] hover:bg-[#1b1e2c] hover:text-[#F7F8F8]'
                    }`}
                  >
                    {priority === 'URGENT'
                      ? '🔴 Urgent'
                      : priority === 'NORMAL'
                        ? '🟡 Normal'
                        : priority === 'LOW_PRIORITY'
                          ? '🟢 Low'
                          : 'All'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <p className="text-sm font-semibold text-[#8A8F98] mb-2">Date Range</p>
              <div className="grid grid-cols-3 gap-2">
                {['today', 'week', 'all'].map((range) => (
                  <Button
                    key={range}
                    onClick={() => handleDateRangeChange(range as 'today' | 'week' | 'all')}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.dateRange === range ? 'bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] shadow-md' : 'bg-[#10121b] border border-[#232636] text-[#8A8F98] hover:bg-[#1b1e2c] hover:text-[#F7F8F8]'
                    }`}
                  >
                    {range === 'today' ? '📅 Today' : range === 'week' ? '📆 Week' : 'All'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <p className="text-sm font-semibold text-[#8A8F98] mb-2">Sort By</p>
              <div className="grid grid-cols-3 gap-2">
                {['recent', 'urgent', 'progress'].map((sort) => (
                  <Button
                    key={sort}
                    onClick={() => handleSortChange(sort as 'recent' | 'urgent' | 'progress')}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.sortBy === sort ? 'bg-[#5e6ad2] hover:bg-[#6d78d5] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] shadow-md' : 'bg-[#10121b] border border-[#232636] text-[#8A8F98] hover:bg-[#1b1e2c] hover:text-[#F7F8F8]'
                    }`}
                  >
                    {sort === 'recent'
                      ? '🕐 Recent'
                      : sort === 'urgent'
                        ? '⚡ Urgent'
                        : '📊 Progress'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
