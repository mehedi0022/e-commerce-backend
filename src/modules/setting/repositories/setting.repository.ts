import { pool } from "../../../prisma/db.js";
import type { StoreSettingRecord } from "../setting.types.js";

let isTableInitialized = false;

export class SettingRepository {
  /**
   * Ensures the `store_setting` table exists in PostgreSQL.
   */
  async ensureTable(): Promise<void> {
    if (isTableInitialized) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_setting (
        id SERIAL PRIMARY KEY,
        "key" VARCHAR(100) UNIQUE NOT NULL,
        "value" JSONB NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_store_setting_key ON store_setting("key");
    `);

    isTableInitialized = true;
  }

  /**
   * Retrieves a setting record by its unique key.
   */
  async getByKey(key: string): Promise<StoreSettingRecord | null> {
    await this.ensureTable();

    const result = await pool.query<StoreSettingRecord>(
      `SELECT id, "key", "value", "description", "createdAt", "updatedAt"
       FROM store_setting
       WHERE "key" = $1
       LIMIT 1;`,
      [key]
    );

    return result.rows[0] || null;
  }

  /**
   * Inserts or updates a setting record by key.
   */
  async upsert(
    key: string,
    value: any,
    description?: string
  ): Promise<StoreSettingRecord> {
    await this.ensureTable();

    const result = await pool.query<StoreSettingRecord>(
      `INSERT INTO store_setting ("key", "value", "description", "updatedAt")
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT ("key") DO UPDATE
         SET "value" = EXCLUDED."value",
             "description" = COALESCE(EXCLUDED."description", store_setting."description"),
             "updatedAt" = NOW()
       RETURNING id, "key", "value", "description", "createdAt", "updatedAt";`,
      [key, JSON.stringify(value), description || null]
    );

    return result.rows[0];
  }
}

export const settingRepository = new SettingRepository();
