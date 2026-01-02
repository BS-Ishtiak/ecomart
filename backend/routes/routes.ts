import { Router, Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import type jwt from "jsonwebtoken";
import type bcrypt from "bcryptjs";
import { authorizeUser,  createAdminUser, createUsers, deleteProduct, getProducts, updateProduct, refreshTokenHandler, logoutHandler,meHandler,getAllUsersHandler,getPaginatedProductsHandler,getAllProductsHandler,addProductHandler} from "../controllers/contactController";


// Add role to JWT payload types
type AccessTokenPayload = { id: number; email: string; name?: string; role: string };
type RefreshTokenPayload = { id: number; email: string; role: string };

type RouteDeps = {
  pool: Pool;
  refreshStore: Set<string>;
  signAccessToken: (payload: AccessTokenPayload) => string;
  signRefreshToken: (payload: RefreshTokenPayload) => string;
  authenticateToken: (req: Request, res: Response, next: NextFunction) => void;
  isValidPassword: (password: string) => boolean;
  jwt: typeof jwt;
  bcrypt: typeof bcrypt;
  logErrorToAuditDb: (error_message: string, error_stack?: string) => Promise<void>;
  logUpdateToAuditDb: (admin_id: number, action_type: string, target_table: string, target_id: number, details?: string) => Promise<void>;
};

export function createRoutes({ pool, refreshStore, signAccessToken, signRefreshToken, authenticateToken, jwt }: RouteDeps) {
  const router = Router();

// Admin middleware
  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    // @ts-ignore: custom user property injected by authenticateToken
    if (req.user && req.user.role === "admin") {
      return next();
    }
    return res.status(403).json({ error: "Admin access required" });
  }  

  
  router.get("/", getProducts);

  router.post("/signup", createUsers(pool));
 // Seed admin user route (for dev/testing)
  router.post("/seed-admin", createAdminUser(pool));

  router.post("/login", authorizeUser(pool, signAccessToken, signRefreshToken, refreshStore));

  router.delete("/products/:id", authenticateToken, requireAdmin, deleteProduct(pool));

  router.put("/products/:id", authenticateToken, requireAdmin, updateProduct(pool));

  router.post("/token", refreshTokenHandler(pool, signAccessToken, jwt));

  
  router.post("/logout", logoutHandler);

  // Protected route
  router.get("/me", authenticateToken, meHandler);

  // Protected route to get all users
  router.get("/users", authenticateToken, getAllUsersHandler(pool));

  // Protected paginated products route
  router.post("/products/get-all", authenticateToken, getPaginatedProductsHandler(pool));

  // Protected route to get all products (for client-side pagination)
  router.get("/products/all", authenticateToken, getAllProductsHandler(pool));

  // Protected add-product route
  router.post("/add-product", authenticateToken, addProductHandler(pool));

  return router;
}
