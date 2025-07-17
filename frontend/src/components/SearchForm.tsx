import React, { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { formatDateTimeLocal } from '../utils/formatting';

interface SearchFormProps {
  onSearch: (startDate: string, endDate: string) => void;
  loading: boolean;
  responseTime?: string;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, loading, responseTime }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Please provide both start and end dates');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      setError('End date must be after start date');
      return;
    }

    // Convert to ISO string format for API
    onSearch(start.toISOString(), end.toISOString());
  };

  const setQuickRange = (days: number) => {
    const now = new Date();
    const start = formatDateTimeLocal(now);
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const end = formatDateTimeLocal(future);
    
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Search Events</h2>
        {responseTime && (
          <span className="text-sm text-gray-600">
            Last search: <span className="font-medium text-green-600">{responseTime}</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick range buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-gray-600 mr-2">Quick ranges:</span>
          <button
            type="button"
            onClick={() => setQuickRange(7)}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Next 7 days
          </button>
          <button
            type="button"
            onClick={() => setQuickRange(30)}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Next 30 days
          </button>
          <button
            type="button"
            onClick={() => setQuickRange(90)}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Next 3 months
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="starts_at" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              id="starts_at"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              required
            />
          </div>
          
          <div>
            <label htmlFor="ends_at" className="block text-sm font-medium text-gray-700 mb-2">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              id="ends_at"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              required
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <RefreshCw className="animate-spin -ml-1 mr-3 h-5 w-5" />
            ) : (
              <Search className="-ml-1 mr-3 h-5 w-5" />
            )}
            {loading ? 'Searching...' : 'Search Events'}
          </button>
        </div>
      </form>
    </div>
  );
};