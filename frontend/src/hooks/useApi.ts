import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { Plan, Stats, SearchResponse, ApiError } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again');
    }
    if (error.response?.status === 429) {
      throw new Error('Too many requests - please wait a moment');
    }
    if (error.response?.status && error.response.status >= 500) {
      throw new Error('Server error - please try again later');
    }
    throw error;
  }
);

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useApi = <T>() => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
};

export const useSearchPlans = () => {
  const { data, loading, error, execute, reset } = useApi<SearchResponse>();

  const searchPlans = useCallback((startDate: string, endDate: string) => {
    return execute(async () => {
      const params = new URLSearchParams({
        starts_at: startDate,
        ends_at: endDate,
      });

      const response = await apiClient.get<SearchResponse>(`/search?${params}`);
      return response.data;
    });
  }, [execute]);

  return {
    plans: data?.data || [],
    meta: data?.meta,
    loading,
    error,
    searchPlans,
    reset,
  };
};

export const useStats = () => {
  const { data, loading, error, execute, reset } = useApi<Stats>();

  const fetchStats = useCallback(() => {
    return execute(async () => {
      const response = await apiClient.get<Stats>('/admin/stats');
      return response.data;
    });
  }, [execute]);

  return {
    stats: data,
    loading,
    error,
    fetchStats,
    reset,
  };
};

export const useManualSync = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const triggerSync = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await apiClient.post('/admin/sync');
      setSuccess(true);
      
      // Reset success state after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    loading,
    error,
    success,
    triggerSync,
    reset,
  };
};

export const useHealthCheck = () => {
  const { data, loading, error, execute } = useApi<any>();

  const checkHealth = useCallback(() => {
    return execute(async () => {
      const response = await apiClient.get('/admin/health');
      return response.data;
    });
  }, [execute]);

  return {
    health: data,
    loading,
    error,
    checkHealth,
  };
};

// Utility function to extract error messages
const extractErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (axios.isAxiosError(error)) {
    if (error.response?.data) {
      const apiError = error.response.data as ApiError;
      return apiError.message || apiError.error || 'An error occurred';
    }
    return error.message || 'Network error occurred';
  }

  return 'An unexpected error occurred';
};

export { apiClient };