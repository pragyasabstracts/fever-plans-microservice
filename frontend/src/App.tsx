import React, { useState, useEffect } from 'react';
import { Search, AlertCircle } from 'lucide-react';

// Components
import { Header } from './components/Header';
import { SearchForm } from './components/SearchForm';
import { PlanCard } from './components/PlanCard';
import { StatsGrid } from './components/StatsGrid';

// Hooks
import { useSearchPlans, useStats, useManualSync } from './hooks/useApi';

// Types
import { Plan } from './types';

const FeverPlansApp: React.FC = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // API hooks
  const { plans, meta, loading: searchLoading, error: searchError, searchPlans, reset: resetSearch } = useSearchPlans();
  const { stats, loading: statsLoading, fetchStats } = useStats();
  const { loading: syncLoading, error: syncError, success: syncSuccess, triggerSync } = useManualSync();

  // Load initial stats
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Refresh stats after successful sync
  useEffect(() => {
    if (syncSuccess) {
      fetchStats();
    }
  }, [syncSuccess, fetchStats]);

  const handleSearch = async (startDate: string, endDate: string) => {
    try {
      await searchPlans(startDate, endDate);
      setSearchPerformed(true);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleSync = async () => {
    try {
      await triggerSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const isLoading = searchLoading || syncLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <Header onSync={handleSync} isLoading={isLoading} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Dashboard */}
        {stats && !statsLoading && (
          <div className="mb-8">
            <StatsGrid stats={stats} />
          </div>
        )}

        {/* Sync Messages */}
        {syncSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">Data synchronization completed successfully!</p>
              </div>
            </div>
          </div>
        )}

        {syncError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              <p className="text-sm text-red-800">Sync failed: {syncError}</p>
            </div>
          </div>
        )}

        {/* Search Form */}
        <div className="mb-8">
          <SearchForm 
            onSearch={handleSearch} 
            loading={searchLoading}
            responseTime={meta?.responseTime}
          />
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Search Error</h3>
                <p className="text-sm text-red-700 mt-1">{searchError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchPerformed && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Search Results {meta && `(${meta.count} events found)`}
              </h2>
              {searchPerformed && (
                <button
                  onClick={() => {
                    resetSearch();
                    setSearchPerformed(false);
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear Results
                </button>
              )}
            </div>

            {plans.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {plans.map((plan: Plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  No events were found in the specified time range. Try adjusting your search criteria or check if there are events available in our system.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!searchPerformed && !searchLoading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to discover events</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Use the search form above to find events within your desired time range. 
              All searches are lightning-fast thanks to our optimized caching system.
            </p>
          </div>
        )}

        {/* Loading State */}
        {searchLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Searching events...</h3>
            <p className="text-sm text-gray-600">
              Finding the perfect events for your selected time range.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Fever Plans Microservice • Built with React, TypeScript, and ❤️
            </p>
            <p className="text-xs text-gray-500 mt-2">
              High-performance event discovery and management platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FeverPlansApp;