import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '../utils/logger';
import { config } from '../config';
import { ProviderResponse } from '../types';

export class ProviderService {
  private httpClient: AxiosInstance;
  private xmlParser: XMLParser;

  constructor() {
    this.httpClient = axios.create({
      timeout: config.provider.timeoutMs,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Fever-Plans-Microservice/1.0.0',
        'Accept': 'application/xml, text/xml',
      },
    });

    // Setup axios interceptors for retry logic
    this.setupRetryLogic();

    // Configure XML parser
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
      trimValues: true,
      allowBooleanAttributes: true,
    });
  }

  private setupRetryLogic(): void {
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        // Don't retry if we've already exceeded max retries
        if (!config || config.__retryCount >= this.getMaxRetries()) {
          return Promise.reject(error);
        }

        // Initialize retry count
        config.__retryCount = config.__retryCount || 0;
        config.__retryCount++;

        // Should we retry this error?
        if (this.shouldRetry(error)) {
          logger.warn(`Retrying request (attempt ${config.__retryCount}/${this.getMaxRetries()})`, {
            url: config.url,
            error: error.message,
          });

          // Exponential backoff delay
          const delay = Math.pow(2, config.__retryCount) * 1000;
          await this.sleep(delay);

          return this.httpClient(config);
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors or 5xx status codes
    return (
      !error.response ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      (error.response && error.response.status >= 500)
    );
  }

  private getMaxRetries(): number {
    return config.provider.retries;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchPlans(): Promise<ProviderResponse> {
    try {
      logger.info('Fetching plans from external provider', {
        url: config.provider.url,
        timeout: config.provider.timeoutMs,
      });

      const startTime = Date.now();
      const response: AxiosResponse<string> = await this.httpClient.get(config.provider.url);
      const responseTime = Date.now() - startTime;

      logger.info('Successfully fetched data from provider', {
        responseTime: `${responseTime}ms`,
        dataSize: response.data.length,
        statusCode: response.status,
      });

      // Parse XML response
      const parsedData = this.xmlParser.parse(response.data);
      
      // Validate the response structure
      this.validateProviderResponse(parsedData);

      return parsedData as ProviderResponse;
    } catch (error) {
      this.handleFetchError(error);
      throw error;
    }
  }

  private validateProviderResponse(data: any): void {
    if (!data || !data.planList || !data.planList.output) {
      throw new Error('Invalid provider response: missing required structure');
    }

    const output = data.planList.output;
    if (!output.base_plan || !Array.isArray(output.base_plan)) {
      logger.warn('Provider response contains no plans or invalid plan structure');
      // Set empty array if no plans
      output.base_plan = [];
    }
  }

  private handleFetchError(error: any): void {
    if (error.code === 'ENOTFOUND') {
      logger.error('Provider service unreachable - DNS resolution failed', {
        url: config.provider.url,
        error: error.message,
      });
    } else if (error.code === 'ETIMEDOUT') {
      logger.error('Provider service timeout', {
        url: config.provider.url,
        timeout: config.provider.timeoutMs,
        error: error.message,
      });
    } else if (error.response) {
      logger.error('Provider service returned error response', {
        url: config.provider.url,
        status: error.response.status,
        statusText: error.response.statusText,
        error: error.message,
      });
    } else {
      logger.error('Unknown error while fetching from provider', {
        url: config.provider.url,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Use a shorter timeout for health checks
      const healthClient = axios.create({
        timeout: 5000,
        headers: this.httpClient.defaults.headers,
      });

      await healthClient.get(config.provider.url);
      return true;
    } catch (error) {
      logger.debug('Provider health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  getProviderUrl(): string {
    return config.provider.url;
  }

  getTimeout(): number {
    return config.provider.timeoutMs;
  }
}