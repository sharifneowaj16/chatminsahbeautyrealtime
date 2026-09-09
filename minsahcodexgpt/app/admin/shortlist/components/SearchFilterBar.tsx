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
    <div className="bg-[#1E1E24] border border-[#2A2A32] rounded-xl shadow-sm">
      <div className="p-4 sm:p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Input
            type="text"
            placeholder="🔍 Search by order #, customer name, or phone..."
            value={filters.searchQuery}
            onChange={handleSearch}
            className="w-full px-4 py-3 pl-10 border border-[#2A2A32] bg-[#14141A] text-[#F5F3F0] placeholder-[#6B6864] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D07A60] text-sm sm:text-base"
          />
          <span className="absolute left-3 top-3.5 text-[#6B6864]">🔍</span>
        </div>

        {/* Filter Toggle Button */}
        <Button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full sm:w-auto px-4 py-2 bg-[#2A2A32] border border-[#3E3E48] text-[#F5F3F0] rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#3E3E48] transition-colors"
        >
          <span>⚙️ Filters</span>
          <span className="text-lg">{showFilters ? '▼' : '▶'}</span>
        </Button>

        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-[#2A2A32]">
            {/* Status Filter */}
            <div>
              <p className="text-sm font-semibold text-[#9A9691] mb-2">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {['pending', 'completed'].map((status) => (
                  <Button
                    key={status}
                    onClick={() => handleStatusChange(status as 'pending' | 'completed')}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.status === status ? 'bg-[#D07A60] text-white shadow-md' : 'bg-[#14141A] border border-[#2A2A32] text-[#9A9691] hover:bg-[#26262E] hover:text-[#F5F3F0]'
                    }`}
                  >
                    {status === 'pending' ? '⏳ Pending' : '✅ Completed'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <p className="text-sm font-semibold text-[#9A9691] mb-2">Priority</p>
              <div className="grid grid-cols-2 gap-2">
                {['ALL', 'URGENT', 'NORMAL', 'LOW_PRIORITY'].map((priority) => (
                  <Button
                    key={priority}
                    onClick={() => handlePriorityChange(priority)}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.priority === priority ? 'bg-[#D07A60] text-white shadow-md' : 'bg-[#14141A] border border-[#2A2A32] text-[#9A9691] hover:bg-[#26262E] hover:text-[#F5F3F0]'
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
              <p className="text-sm font-semibold text-[#9A9691] mb-2">Date Range</p>
              <div className="grid grid-cols-3 gap-2">
                {['today', 'week', 'all'].map((range) => (
                  <Button
                    key={range}
                    onClick={() => handleDateRangeChange(range as 'today' | 'week' | 'all')}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.dateRange === range ? 'bg-[#D07A60] text-white shadow-md' : 'bg-[#14141A] border border-[#2A2A32] text-[#9A9691] hover:bg-[#26262E] hover:text-[#F5F3F0]'
                    }`}
                  >
                    {range === 'today' ? '📅 Today' : range === 'week' ? '📆 Week' : 'All'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <p className="text-sm font-semibold text-[#9A9691] mb-2">Sort By</p>
              <div className="grid grid-cols-3 gap-2">
                {['recent', 'urgent', 'progress'].map((sort) => (
                  <Button
                    key={sort}
                    onClick={() => handleSortChange(sort as 'recent' | 'urgent' | 'progress')}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.sortBy === sort ? 'bg-[#D07A60] text-white shadow-md' : 'bg-[#14141A] border border-[#2A2A32] text-[#9A9691] hover:bg-[#26262E] hover:text-[#F5F3F0]'
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
