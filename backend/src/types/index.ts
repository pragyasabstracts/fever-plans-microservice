export interface Plan {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  sellFrom: Date;
  sellTo: Date;
  soldOut: boolean;
  sellMode: 'online' | 'offline';
  organizerCompanyId?: string;
  zones: Zone[];
  basePlanId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Zone {
  id: string;
  name: string;
  capacity: number;
  price: number;
  numbered: boolean;
  planId: string;
}

export interface SearchParams {
  startsAt: Date;
  endsAt: Date;
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
  lastSync: Date | null;
  cacheHitRate: number;
  avgResponseTime: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: any[];
}

export interface ProviderResponse {
  planList: {
    output: {
      base_plan: ProviderBasePlan[];
    };
  };
}

export interface ProviderBasePlan {
  base_plan_id: string;
  sell_mode: 'online' | 'offline';
  title: string;
  organizer_company_id?: string;
  plan: ProviderPlan[];
}

export interface ProviderPlan {
  plan_id: string;
  plan_start_date: string;
  plan_end_date: string;
  sell_from: string;
  sell_to: string;
  sold_out: string;
  zone: ProviderZone[];
}

export interface ProviderZone {
  zone_id: string;
  capacity: string;
  price: string;
  name: string;
  numbered: string;
}