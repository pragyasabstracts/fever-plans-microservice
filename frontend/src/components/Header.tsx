import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onSync: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSync, isLoading }) => {
  return (
    <header className="bg-white shadow-lg border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fever Plans</h1>
              <p className="text-sm text-gray-600">Event Discovery & Management</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={onSync}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};