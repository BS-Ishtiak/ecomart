
import cors from "cors";
import express from "express";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Custom Express request type augmentation
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; name?: string; iat?: number; exp?: number };
    }
  }
}

// Middleware to verify access token
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "CHANGE_ME_access_secret_!@#";
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

// CORS middleware
export const corsMiddleware = cors({
  origin: "http://localhost:3000",
  credentials: true,
});

// JSON body parser
export const jsonMiddleware = express.json();
