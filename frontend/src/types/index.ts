export interface Zone {
  id: string;
  name: string;
  capacity: number;
  price: number;
  numbered: boolean;
  planId: string;
}

export interface Plan {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  sellFrom: string;
  sellTo: string;
  soldOut: boolean;
  sellMode: 'online' | 'offline';
  organizerCompanyId?: string;
  zones: Zone[];
  basePlanId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResponse {
  data: Plan[];
  meta: {
    count: number;
    responseTime: string;
  };
}

export interface Stats {
  totalPlans: number;
  onlinePlans: number;
  offlinePlans: number;
  totalZones: number;
  lastSync: string | null;
  cacheHitRate: number;
  avgResponseTime: number;
  cacheStatus?: boolean;
  syncStatus?: {
    isRunning: boolean;
    isSyncing: boolean;
  };
  uptime?: number;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timestamp?: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface SearchParams {
  startsAt: string;
  endsAt: string;
}