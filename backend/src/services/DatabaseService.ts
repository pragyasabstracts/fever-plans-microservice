import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Plan, Zone, Stats } from '../types';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

export class DatabaseService {
  private db: Database | null = null;

  constructor() {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'fever_plans.db');
      
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      await this.createTables();
      await this.createIndexes();
      logger.info('SQLite database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create plans table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS plans (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          sell_from DATETIME NOT NULL,
          sell_to DATETIME NOT NULL,
          sold_out BOOLEAN NOT NULL DEFAULT 0,
          sell_mode TEXT NOT NULL,
          organizer_company_id TEXT,
          base_plan_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create zones table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS zones (
          id TEXT NOT NULL,
          plan_id TEXT NOT NULL,
          name TEXT NOT NULL,
          capacity INTEGER NOT NULL CHECK (capacity >= 0),
          price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
          numbered BOOLEAN NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id, plan_id),
          FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
        );
      `);

      logger.info('Database tables created successfully');
    } catch (error) {
      logger.error('Failed to create tables:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Indexes for better query performance
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_plans_start_date ON plans(start_date);
      `);
      
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_plans_end_date ON plans(end_date);
      `);
      
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_plans_sell_mode ON plans(sell_mode);
      `);
      
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_plans_date_range ON plans(start_date, end_date);
      `);
      
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_zones_plan_id ON zones(plan_id);
      `);

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Failed to create indexes:', error);
      throw error;
    }
  }

  async searchPlans(startDate: Date, endDate: Date): Promise<Plan[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Query plans that overlap with the search range and are online
      const planQuery = `
        SELECT DISTINCT p.* FROM plans p
        WHERE p.sell_mode = 'online'
        AND (
          (p.start_date >= ? AND p.start_date < ?) OR
          (p.end_date > ? AND p.end_date <= ?) OR
          (p.start_date <= ? AND p.end_date >= ?)
        )
        ORDER BY p.start_date, p.title
      `;

      const planRows = await this.db.all(planQuery, [
        startDate.toISOString(), endDate.toISOString(),
        startDate.toISOString(), endDate.toISOString(),
        startDate.toISOString(), endDate.toISOString()
      ]);
      
      if (planRows.length === 0) {
        return [];
      }

      // Get all zones for the found plans
      const planIds = planRows.map((row: any) => row.id);
      const placeholders = planIds.map(() => '?').join(',');
      const zoneQuery = `
        SELECT * FROM zones 
        WHERE plan_id IN (${placeholders})
        ORDER BY plan_id, name
      `;

      const zoneRows = await this.db.all(zoneQuery, planIds);
      
      // Group zones by plan ID
      const zonesByPlan = new Map<string, Zone[]>();
      zoneRows.forEach((row: any) => {
        if (!zonesByPlan.has(row.plan_id)) {
          zonesByPlan.set(row.plan_id, []);
        }
        zonesByPlan.get(row.plan_id)!.push({
          id: row.id,
          name: row.name,
          capacity: row.capacity,
          price: parseFloat(row.price.toString()),
          numbered: Boolean(row.numbered),
          planId: row.plan_id
        });
      });

      // Build final plan objects
      return planRows.map((row: any) => ({
        id: row.id,
        title: row.title,
        startDate: new Date(row.start_date),
        endDate: new Date(row.end_date),
        sellFrom: new Date(row.sell_from),
        sellTo: new Date(row.sell_to),
        soldOut: Boolean(row.sold_out),
        sellMode: row.sell_mode,
        organizerCompanyId: row.organizer_company_id,
        basePlanId: row.base_plan_id,
        zones: zonesByPlan.get(row.id) || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      logger.error('Failed to search plans:', error);
      throw error;
    }
  }

  async upsertPlans(plans: Plan[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (plans.length === 0) return;

    try {
      await this.db.exec('BEGIN TRANSACTION');

      for (const plan of plans) {
        // Upsert plan
        await this.db.run(`
          INSERT OR REPLACE INTO plans (
            id, title, start_date, end_date, sell_from, sell_to,
            sold_out, sell_mode, organizer_company_id, base_plan_id, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          plan.id, plan.title, plan.startDate.toISOString(), plan.endDate.toISOString(),
          plan.sellFrom.toISOString(), plan.sellTo.toISOString(), plan.soldOut ? 1 : 0, 
          plan.sellMode, plan.organizerCompanyId, plan.basePlanId
        ]);

        // Remove existing zones and insert new ones
        await this.db.run('DELETE FROM zones WHERE plan_id = ?', [plan.id]);

        for (const zone of plan.zones) {
          await this.db.run(`
            INSERT INTO zones (id, plan_id, name, capacity, price, numbered)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [zone.id, plan.id, zone.name, zone.capacity, zone.price, zone.numbered ? 1 : 0]);
        }
      }

      await this.db.exec('COMMIT');
      logger.info(`Successfully upserted ${plans.length} plans`);
    } catch (error) {
      await this.db.exec('ROLLBACK');
      logger.error('Failed to upsert plans:', error);
      throw error;
    }
  }

  async getStats(): Promise<Stats> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.get(`
        SELECT 
          COUNT(*) as total_plans,
          SUM(CASE WHEN sell_mode = 'online' THEN 1 ELSE 0 END) as online_plans,
          SUM(CASE WHEN sell_mode = 'offline' THEN 1 ELSE 0 END) as offline_plans,
          (SELECT COUNT(*) FROM zones) as total_zones,
          MAX(updated_at) as last_sync
        FROM plans
      `);

      return {
        totalPlans: result?.total_plans || 0,
        onlinePlans: result?.online_plans || 0,
        offlinePlans: result?.offline_plans || 0,
        totalZones: result?.total_zones || 0,
        lastSync: result?.last_sync ? new Date(result.last_sync) : null,
        cacheHitRate: 0, // Will be calculated by cache service
        avgResponseTime: 0 // Will be calculated by metrics service
      };
    } catch (error) {
      logger.error('Failed to get stats:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      logger.info('Database connections closed');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.get('SELECT 1 as test');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}