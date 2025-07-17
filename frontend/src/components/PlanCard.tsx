import React from 'react';
import { Calendar, Clock, Users, DollarSign, MapPin } from 'lucide-react';
import { Plan } from '../types';
import { formatDate, formatTime, formatPrice, getTotalCapacity, getMinPrice } from '../utils/formatting';

interface PlanCardProps {
  plan: Plan;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const totalCapacity = getTotalCapacity(plan.zones);
  const minPrice = getMinPrice(plan.zones);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {plan.title}
            </h3>
            <div className="flex flex-col space-y-1 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(plan.startDate)}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span>
                  {formatTime(plan.startDate)} - {formatTime(plan.endDate)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              plan.sellMode === 'online' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {plan.sellMode}
            </span>
            {plan.soldOut && (
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2 text-blue-500" />
            <span>{totalCapacity} total seats</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign className="w-4 h-4 mr-2 text-green-500" />
            <span>From {formatPrice(minPrice)}</span>
          </div>
        </div>

        {/* Zones */}
        {plan.zones.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Available Zones ({plan.zones.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {plan.zones.map((zone) => (
                <div
                  key={`${zone.id}-${zone.planId}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      zone.capacity > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{zone.name}</p>
                      <p className="text-xs text-gray-600">
                        {zone.numbered ? 'Numbered seats' : 'General admission'} • 
                        {zone.capacity > 0 ? ` ${zone.capacity} available` : ' Sold out'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatPrice(zone.price)}
                    </p>
                    <p className="text-xs text-gray-500">
                      per ticket
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">Sales period:</span>
              <div className="mt-1">
                <div>{formatDate(plan.sellFrom)}</div>
                <div>to {formatDate(plan.sellTo)}</div>
              </div>
            </div>
            <div>
              <span className="font-medium">Event details:</span>
              <div className="mt-1">
                <div>Plan ID: {plan.id}</div>
                <div>Base Plan: {plan.basePlanId}</div>
                {plan.organizerCompanyId && (
                  <div>Organizer: {plan.organizerCompanyId}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};