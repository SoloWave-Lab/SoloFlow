import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const rawDbUrl = process.env.DATABASE_URL || "";
    let connectionString = rawDbUrl;
    try {
      const u = new URL(rawDbUrl);
      u.search = "";
      connectionString = u.toString();
    } catch {
      throw new Error("Invalid database URL");
    }
    pool = new Pool({ 
      connectionString, 
      ssl: connectionString.includes('supabase.co') 
        ? { rejectUnauthorized: false } // Supabase uses certificates that may not be trusted by Node.js
        : process.env.NODE_ENV === "production" 
          ? { rejectUnauthorized: true }
          : { rejectUnauthorized: false }
    });
  }
  return pool;
}

export const db = {
  async query<T = any>(text: string, params?: any[]) {
    const client = await getPool().connect();
    try {
      return await client.query<T>(text, params);
    } finally {
      client.release();
    }
  },

  async getClient() {
    return await getPool().connect();
  },

  async transaction<T>(callback: (client: Pool) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await callback(getPool());
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};