import "dotenv/config";
import { Pool } from "pg";
import fs from "fs";
import path from "path";

async function run() {
  const rawDbUrl = process.env.DATABASE_URL || "";
  let connectionString = rawDbUrl;
  try {
    const u = new URL(rawDbUrl);
    u.search = "";
    connectionString = u.toString();
  } catch {
    console.error("Invalid database URL");
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('supabase.co') 
      ? { rejectUnauthorized: false } // Supabase uses certificates that may not be trusted by Node.js
      : process.env.NODE_ENV === "production" 
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false },
  });
  
  try {
    const dir = path.resolve("migrations");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      console.log(`Running migration: ${file}`);
      
      try {
        // Try executing the entire file as one query first
        await pool.query(sql);
        console.log(`✓ ${file} executed successfully`);
      } catch (err: any) {
        console.error(`Error executing ${file}:`, err.message);
        throw err;
      }
    }
    
    console.log("All migrations applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
