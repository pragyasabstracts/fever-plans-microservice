import { Plan, Zone, Stats, ProviderResponse, ProviderBasePlan, ProviderPlan } from '../types';
import { DatabaseService } from './DatabaseService';
import { CacheService } from './CacheService';
import { ProviderService } from './ProviderService';
import { logger } from '../utils/logger';
import { config } from '../config';

export class PlansService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  constructor(
    private databaseService: DatabaseService,
    private cacheService: CacheService,
    private providerService: ProviderService
  ) {}

  async searchPlans(startDate: Date, endDate: Date): Promise<Plan[]> {
    const cacheKey = this.cacheService.generateSearchKey(startDate, endDate);
    
    try {
      // Try cache first for better performance
      const cachedResult = await this.cacheService.get<Plan[]>(cacheKey);
      if (cachedResult) {
        logger.debug('Cache hit for search query', { startDate, endDate });
        return cachedResult;
      }

      // Query database if cache miss
      logger.debug('Cache miss, querying database', { startDate, endDate });
      const plans = await this.databaseService.searchPlans(startDate, endDate);
      
      // Cache the result for future requests
      await this.cacheService.set(cacheKey, plans, config.cache.searchTtl);
      
      logger.info('Search completed successfully', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        resultCount: plans.length,
      });

      return plans;
    } catch (error) {
      logger.error('Error during plan search', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async syncPlans(): Promise<void> {
    if (this.isSyncing) {
      logger.warn('Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;
    const syncStartTime = Date.now();

    try {
      logger.info('Starting plans synchronization');
      
      // Fetch data from external provider
      const providerData = await this.providerService.fetchPlans();
      
      // Transform provider data to our internal format
      const plans = this.transformProviderData(providerData);
      
      // Save to database
      await this.databaseService.upsertPlans(plans);
      
      // Clear relevant caches after successful sync
      await this.clearCaches();
      
      const syncDuration = Date.now() - syncStartTime;
      logger.info('Plans synchronization completed successfully', {
        plansProcessed: plans.length,
        syncDuration: `${syncDuration}ms`,
      });
    } catch (error) {
      logger.error('Plans synchronization failed', {
        error: error instanceof Error ? error.message : error,
        syncDuration: `${Date.now() - syncStartTime}ms`,
      });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  private transformProviderData(providerData: ProviderResponse): Plan[] {
    const plans: Plan[] = [];
    
    if (!providerData?.planList?.output?.base_plan) {
      logger.warn('No plans found in provider response');
      return plans;
    }

    const basePlans = providerData.planList.output.base_plan;
    logger.debug(`Processing ${basePlans.length} base plans from provider`);

    basePlans.forEach((basePlan: ProviderBasePlan) => {
      if (!basePlan.plan || !Array.isArray(basePlan.plan)) {
        logger.debug(`Skipping base plan ${basePlan.base_plan_id} - no plans array`);
        return;
      }

      basePlan.plan.forEach((providerPlan: ProviderPlan) => {
        try {
          const plan = this.transformSinglePlan(basePlan, providerPlan);
          plans.push(plan);
        } catch (error) {
          logger.warn('Failed to transform plan', {
            basePlanId: basePlan.base_plan_id,
            planId: providerPlan.plan_id,
            error: error instanceof Error ? error.message : error,
          });
        }
      });
    });

    logger.info(`Successfully transformed ${plans.length} plans from provider data`);
    return plans;
  }

  private transformSinglePlan(basePlan: ProviderBasePlan, providerPlan: ProviderPlan): Plan {
    const zones: Zone[] = [];
    
    if (providerPlan.zone && Array.isArray(providerPlan.zone)) {
      providerPlan.zone.forEach((zone) => {
        zones.push({
          id: zone.zone_id,
          name: zone.name,
          capacity: parseInt(zone.capacity, 10) || 0,
          price: parseFloat(zone.price) || 0,
          numbered: zone.numbered === 'true',
          planId: providerPlan.plan_id,
        });
      });
    }

    return {
      id: providerPlan.plan_id,
      title: basePlan.title,
      startDate: new Date(providerPlan.plan_start_date),
      endDate: new Date(providerPlan.plan_end_date),
      sellFrom: new Date(providerPlan.sell_from),
      sellTo: new Date(providerPlan.sell_to),
      soldOut: providerPlan.sold_out === 'true',
      sellMode: basePlan.sell_mode,
      organizerCompanyId: basePlan.organizer_company_id,
      basePlanId: basePlan.base_plan_id,
      zones,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async clearCaches(): Promise<void> {
    try {
      // Clear search caches and stats cache
      await this.cacheService.clear();
      logger.debug('Caches cleared after successful sync');
    } catch (error) {
      logger.warn('Failed to clear caches after sync', { error });
      // Don't throw - sync was successful
    }
  }

  async getStats(): Promise<Stats> {
    const cacheKey = this.cacheService.generateStatsKey();

    try {
      // Try cache first
      const cachedStats = await this.cacheService.get<Stats>(cacheKey);
      if (cachedStats) {
        logger.debug('Cache hit for stats');
        return cachedStats;
      }

      // Get fresh stats from database
      const stats = await this.databaseService.getStats();
      
      // Cache stats for a short time
      await this.cacheService.set(cacheKey, stats, config.cache.statsTtl);
      
      return stats;
    } catch (error) {
      logger.error('Error getting stats', { error });
      throw error;
    }
  }

  startPeriodicSync(): void {
    if (this.syncInterval) {
      logger.warn('Periodic sync already started');
      return;
    }

    logger.info('Starting periodic sync', {
      intervalMs: config.sync.intervalMs,
      intervalMinutes: config.sync.intervalMs / 60000,
    });

    // Start periodic sync
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncPlans();
      } catch (error) {
        logger.error('Periodic sync failed', { error });
        // Continue with periodic sync despite failures
      }
    }, config.sync.intervalMs);

    // Perform initial sync
    this.performInitialSync();
  }

  private async performInitialSync(): Promise<void> {
    try {
      logger.info('Performing initial sync');
      await this.syncPlans();
    } catch (error) {
      logger.error('Initial sync failed - service will continue without initial data', { error });
      // Don't throw - service should start even if initial sync fails
    }
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Periodic sync stopped');
    }
  }

  getSyncStatus(): { isRunning: boolean; isSyncing: boolean } {
    return {
      isRunning: this.syncInterval !== null,
      isSyncing: this.isSyncing,
    };
  }

  validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    const now = new Date();
    const maxDate = new Date(now.getFullYear() + 10, 11, 31); // 10 years from now

    if (startDate > maxDate) {
      throw new Error('Start date too far in the future');
    }

    if (endDate < new Date('2000-01-01')) {
      throw new Error('End date too far in the past');
    }
  }
}