import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

// CONFIG (edit these or use env vars in real apps)
const PORT = 5000;
const ACCESS_TOKEN_SECRET = "CHANGE_ME_access_secret_!@#";
const REFRESH_TOKEN_SECRET = "CHANGE_ME_refresh_secret_!@#";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// POSTGRES
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "authdb",
  password: "1234",
  port: 5432,
});

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
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}
function signRefreshToken(payload: { id: number; email: string }) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

// Middleware to verify access token
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: null,
      errors: ["Access token required"],
    });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        data: null,
        message: null,
        errors: ["Invalid or expired access token"],
      });
    }
    req.user = decoded as any;
    next();
  });
}

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
  })
);

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
