import express from "express";
import { corsMiddleware, jsonMiddleware, authenticateToken } from "./middleware";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

// CONFIG (now loaded from .env)
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const ACCESS_TOKEN_SECRET: jwt.Secret = process.env.ACCESS_TOKEN_SECRET || "";
const REFRESH_TOKEN_SECRET: jwt.Secret = process.env.REFRESH_TOKEN_SECRET || "";
const ACCESS_EXPIRES_IN = process.env.ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || "7d";

const app = express();
app.use(jsonMiddleware);
app.use(corsMiddleware);

// POSTGRES
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

// --- Audit DB Integration ---
const auditDbPool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.AUDIT_DB || 'audit_db',
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

export async function logErrorToAuditDb(error_message: string, error_stack?: string) {
  try {
    await auditDbPool.query(
      'INSERT INTO errors (error_message, error_stack) VALUES ($1, $2)',
      [error_message, error_stack || null]
    );
  } catch (err) {
    console.error('Failed to log error to audit_db:', err);
  }
}

export async function logUpdateToAuditDb(admin_id: number, action_type: string, target_table: string, target_id: number, details?: string) {
  try {
    await auditDbPool.query(
      'INSERT INTO updates (admin_id, action_type, target_table, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [admin_id, action_type, target_table, target_id, details || null]
    );
  } catch (err) {
    console.error('Failed to log update to audit_db:', err);
  }
}

// Optional: verify DB connection on boot
pool
  .query("SELECT 1")
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch((e) => console.error("❌ PostgreSQL connection error:", e.message));

// Custom Express request type
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; name?: string; iat?: number; exp?: number };
    }
  }
}



// Store refresh tokens
const refreshStore = new Set<string>();

// JWT helpers
function signAccessToken(payload: { id: number; email: string; name?: string }) {
  const options: SignOptions = { expiresIn: ACCESS_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, options);
}
function signRefreshToken(payload: { id: number; email: string }) {
  const options: SignOptions = { expiresIn: REFRESH_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, options);
}

// ...existing code...

// ===== Password validation function =====
function isValidPassword(password: string): boolean {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}


import { createRoutes } from "./routes";

app.use(
  "/",
  createRoutes({
    pool,
    refreshStore,
    signAccessToken,
    signRefreshToken,
    authenticateToken,
    isValidPassword,
    jwt,
    bcrypt,
    logErrorToAuditDb,
    logUpdateToAuditDb,
  })
);

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
