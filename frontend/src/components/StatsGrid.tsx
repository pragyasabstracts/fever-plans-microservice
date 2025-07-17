import React from 'react';
import { Database, Zap, MapPin, Clock, Activity, TrendingUp } from 'lucide-react';
import { Stats } from '../types';
import { formatNumber, formatRelativeTime, formatDuration, formatBytes } from '../utils/formatting';

interface StatsGridProps {
  stats: Stats;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const statsCards = [
    {
      title: 'Total Plans',
      value: formatNumber(stats.totalPlans),
      icon: Database,
      color: 'blue',
      description: 'All events in database'
    },
    {
      title: 'Online Plans',
      value: formatNumber(stats.onlinePlans),
      icon: Zap,
      color: 'green',
      description: 'Available for booking'
    },
    {
      title: 'Total Zones',
      value: formatNumber(stats.totalZones),
      icon: MapPin,
      color: 'purple',
      description: 'Seating areas'
    },
    {
      title: 'Last Sync',
      value: stats.lastSync ? formatRelativeTime(stats.lastSync) : 'Never',
      icon: Clock,
      color: 'orange',
      description: 'Data synchronization'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'text-blue-600 bg-blue-100',
            green: 'text-green-600 bg-green-100',
            purple: 'text-purple-600 bg-purple-100',
            orange: 'text-orange-600 bg-orange-100'
          };

          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Status */}
      {(stats.cacheStatus !== undefined || stats.syncStatus || stats.uptime !== undefined) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            System Status
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cache Status */}
            {stats.cacheStatus !== undefined && (
              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  stats.cacheStatus 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    stats.cacheStatus ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  Cache {stats.cacheStatus ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            )}

            {/* Sync Status */}
            {stats.syncStatus && (
              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  stats.syncStatus.isSyncing
                    ? 'bg-yellow-100 text-yellow-800'
                    : stats.syncStatus.isRunning
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    stats.syncStatus.isSyncing
                      ? 'bg-yellow-500 animate-pulse'
                      : stats.syncStatus.isRunning
                      ? 'bg-green-500'
                      : 'bg-gray-500'
                  }`} />
                  Sync {
                    stats.syncStatus.isSyncing 
                      ? 'In Progress' 
                      : stats.syncStatus.isRunning 
                      ? 'Active' 
                      : 'Inactive'
                  }
                </div>
              </div>
            )}

            {/* Uptime */}
            {stats.uptime !== undefined && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDuration(stats.uptime)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Memory Usage */}
        {stats.memoryUsage && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Memory Usage
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Heap Used:</span>
                <span className="font-medium">{formatBytes(stats.memoryUsage.heapUsed)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Heap Total:</span>
                <span className="font-medium">{formatBytes(stats.memoryUsage.heapTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">RSS:</span>
                <span className="font-medium">{formatBytes(stats.memoryUsage.rss)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Additional Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Additional Info</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Offline Plans:</span>
              <span className="font-medium">{formatNumber(stats.offlinePlans)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cache Hit Rate:</span>
              <span className="font-medium">{stats.cacheHitRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Avg Response:</span>
              <span className="font-medium">{stats.avgResponseTime.toFixed(0)}ms</span>
            </div>
            {stats.timestamp && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">{formatRelativeTime(stats.timestamp)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};