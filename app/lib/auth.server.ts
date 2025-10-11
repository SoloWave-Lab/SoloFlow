import "dotenv/config";
import { betterAuth } from "better-auth";
import { Pool } from "pg";


const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// Strip query params like sslmode so Pool options below take full effect
const rawDbUrl = process.env.DATABASE_URL || "";
let connectionString = rawDbUrl;
try {
  const u = new URL(rawDbUrl);
  u.search = "";
  connectionString = u.toString();
} catch {
  // keep as-is
}

// Rely on Better Auth's official CLI migration for schema.

console.log("🔧 Initializing Better Auth with:");
console.log("🔧 DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");
console.log("🔧 GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID ? "SET" : "NOT SET");
console.log(
  "🔧 GOOGLE_CLIENT_SECRET:",
  GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET"
);
console.log("🔧 Note: baseURL will be auto-detected from request headers");

// Build trusted origins from env + sensible defaults
const defaultTrustedOrigins = [
  // Dev
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const envTrustedOrigins = (process.env.AUTH_TRUSTED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const trustedOrigins = Array.from(
  new Set([...defaultTrustedOrigins, ...envTrustedOrigins])
);

// Create a pool with proper error handling
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase.co') 
    ? { rejectUnauthorized: false }
    : process.env.NODE_ENV === "production" 
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
  // Supabase pooler configuration
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false, // Keep pool alive to prevent crashes
});

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Don't crash the app, just log the error
});

export const auth = betterAuth({
  basePath: "/api/auth",
  // Force baseURL in development so Google gets the correct redirect_uri
  baseURL:
    process.env.AUTH_BASE_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:5173"
      : undefined),
  // Trust proxy headers to detect HTTPS for secure cookies
  trustProxy: process.env.NODE_ENV === "production",
  // Let Better Auth auto-detect baseURL from the request
  database: pool,

  // Add debugging and callback configuration
  logger: {
    level: "debug",
  },

  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      // Let Better Auth use its default callback endpoint
      // redirectURI will be automatically set to: {baseURL}/api/auth/callback/google
    },
  },
  session: {
    // Increase session expiry
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookie: {
      // Use "lax" for same-site requests, "none" only needed for cross-origin
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "none",
      secure: process.env.NODE_ENV === "production",
      // In production, pin cookie domain to apex so subdomains (if any) share
      // Set via env if provided, else let browser infer from host header
      ...(process.env.AUTH_COOKIE_DOMAIN
        ? { domain: process.env.AUTH_COOKIE_DOMAIN }
        : {}),
      path: "/",
    },
  },
  // Trusted origins for CORS and cookies
  trustedOrigins,
});
// Schema is managed via CLI migrations.

// Export db for use in repositories
export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
  transaction: async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
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

// Export requireAuth helper
export async function requireAuth(request: Request): Promise<{ userId: string }> {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session?.user?.id) {
    throw new Response("Unauthorized", { status: 401 });
  }
  
  return { userId: session.user.userId };
}

// Alias for compatibility
export const requireUser = requireAuth;
