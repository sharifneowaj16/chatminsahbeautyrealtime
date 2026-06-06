// app/admin/shortlist/components/SearchFilterBar.tsx

'use client';

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
    <div className="bg-white border-b border-gray-200">
      <div className="p-4 sm:p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Search by order #, customer name, or phone..."
            value={filters.searchQuery}
            onChange={handleSearch}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-md transition-shadow"
        >
          <span>⚙️ Filters</span>
          <span className="text-lg">{showFilters ? '▼' : '▶'}</span>
        </button>

        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Status Filter */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Status</p>
              <div className="grid grid-cols-2 gap-2">
                {['pending', 'completed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status as 'pending' | 'completed')}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.status === status
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'pending' ? '⏳ Pending' : '✅ Completed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Priority</p>
              <div className="grid grid-cols-2 gap-2">
                {['ALL', 'URGENT', 'NORMAL', 'LOW_PRIORITY'].map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handlePriorityChange(priority)}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.priority === priority
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {priority === 'URGENT'
                      ? '🔴 Urgent'
                      : priority === 'NORMAL'
                        ? '🟡 Normal'
                        : priority === 'LOW_PRIORITY'
                          ? '🟢 Low'
                          : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Date Range</p>
              <div className="grid grid-cols-3 gap-2">
                {['today', 'week', 'all'].map((range) => (
                  <button
                    key={range}
                    onClick={() => handleDateRangeChange(range as 'today' | 'week' | 'all')}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.dateRange === range
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range === 'today' ? '📅 Today' : range === 'week' ? '📆 Week' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Sort By</p>
              <div className="grid grid-cols-3 gap-2">
                {['recent', 'urgent', 'progress'].map((sort) => (
                  <button
                    key={sort}
                    onClick={() => handleSortChange(sort as 'recent' | 'urgent' | 'progress')}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      filters.sortBy === sort
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sort === 'recent'
                      ? '🕐 Recent'
                      : sort === 'urgent'
                        ? '⚡ Urgent'
                        : '📊 Progress'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
