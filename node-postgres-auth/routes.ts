import { Router, Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import type jwt from "jsonwebtoken";
import type bcrypt from "bcryptjs";


type SignupBody = { name: string; email: string; password: string };
type LoginBody = { email: string; password: string };
type TokenBody = { token: string };

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

export function createRoutes({ pool, refreshStore, signAccessToken, signRefreshToken, authenticateToken, isValidPassword, jwt, bcrypt, logErrorToAuditDb, logUpdateToAuditDb }: RouteDeps) {
  const router = Router();

  
  router.get("/", (_req, res) =>
    res.json({ success: true, data: null, message: "Server running", errors: null })
  );

  // Signup
  router.post("/signup", async (req: Request<{}, {}, SignupBody & { role?: string }>, res: Response) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: null,
        errors: ["name, email, password are required"],
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: null,
        errors: [
          "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character",
        ],
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    try {
      await pool.query("INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)", [
        name,
        email,
        hashed,
        role || 'user',
      ]);
      return res.json({
        success: true,
        data: null,
        message: "User registered successfully!",
        errors: null,
      });
    } catch (err: any) {
      if (err?.code === "23505") {
        return res.status(400).json({
          success: false,
          data: null,
          message: null,
          errors: ["Email already exists!"],
        });
      }
      console.error("Signup error:", err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: null,
        errors: ["Server error"],
      });
    }
  });

  // Seed admin user route (for dev/testing)
  router.post("/seed-admin", async (_req: Request, res: Response) => {
    const adminEmail = "admin@example.com";
    const adminPassword = "Admin@1234";
    const hashed = await bcrypt.hash(adminPassword, 10);
    try {
      await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
        ["Admin", adminEmail, hashed, "admin"]
      );
      return res.json({
        success: true,
        message: "Admin user seeded.",
        errors: null,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: null,
        errors: [err.message || "Internal server error"],
      });
    }
  });

  // Login
  router.post("/login", async (req: Request<{}, {}, LoginBody>, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: null,
        errors: ["email and password are required"],
      });
    }

    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: null,
        errors: ["User not found!"],
      });
    }

    const user = result.rows[0] as { id: number; name: string; email: string; password: string; role: string };
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({
        success: false,
        data: null,
        message: null,
        errors: ["Invalid password!"],
      });
    }

  const accessToken = signAccessToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });
    refreshStore.add(refreshToken);

    return res.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email, role: user.role },
      message: "Access and refresh tokens generated",
      accessToken,
      refreshToken,
      errors: null,
    });
  });
  // Middleware to require admin role
  // Admin middleware and routes using standard Request type
  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    // @ts-ignore: custom user property injected by authenticateToken
    if (req.user && req.user.role === "admin") {
      return next();
    }
    return res.status(403).json({ error: "Admin access required" });
  }

  router.delete("/products/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const productId = req.params.id;
      // @ts-ignore: custom user property injected by authenticateToken
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      await pool.query("DELETE FROM products WHERE id = $1", [productId]);
        // Log admin delete action
        await logUpdateToAuditDb(req.user.id, 'delete', 'products', parseInt(productId), 'Product deleted');
      return res.json({
        success: true,
        message: "Product deleted successfully.",
        errors: null,
      });
    } catch (err: any) {
        await logErrorToAuditDb(err.message, err.stack);
      return res.status(500).json({
        success: false,
        message: null,
        errors: [err.message || "Internal server error"],
      });
    }
  });

  router.put("/products/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const productId = req.params.id;
      // @ts-ignore: custom user property injected by authenticateToken
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { name, price, description } = req.body;
      await pool.query(
        "UPDATE products SET name = $1, price = $2, description = $3 WHERE id = $4",
        [name, price, description, productId]
      );
        // Log admin update action
        await logUpdateToAuditDb(req.user.id, 'update', 'products', parseInt(productId), `Product updated: name=${name}, price=${price}, description=${description}`);
      return res.json({
        success: true,
        message: "Product updated successfully.",
        errors: null,
      });
    } catch (err: any) {
        await logErrorToAuditDb(err.message, err.stack);
      return res.status(500).json({
        success: false,
        message: null,
        errors: [err.message || "Internal server error"],
      });
    }
  });

  // Refresh token
  router.post("/token", (req: Request<{}, {}, TokenBody>, res: Response) => {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({
        success: false,
        data: null,
        message: null,
        errors: ["Missing refresh token"],
      });
    }
    if (!refreshStore.has(token)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: null,
        errors: ["Refresh token not recognized"],
      });
    }

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || "CHANGE_ME_refresh_secret_!@#", async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          data: null,
          message: null,
          errors: ["Invalid or expired refresh token"],
        });
      }
      const payload = decoded as { id: number; email: string };
      // Fetch user role from DB
      try {
        const result = await pool.query("SELECT role, name FROM users WHERE id=$1", [payload.id]);
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            data: null,
            message: null,
            errors: ["User not found"],
          });
        }
        const { role, name } = result.rows[0];
        const newAccess = signAccessToken({ id: payload.id, email: payload.email, name, role });
        return res.json({
          success: true,
          data: { accessToken: newAccess },
          message: "New access token generated",
          errors: null,
        });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          data: null,
          message: null,
          errors: [err.message || "Internal server error"],
        });
      }
    });
  });

  
  router.post("/logout", (req: Request<{}, {}, TokenBody>, res: Response) => {
    const { token } = req.body;
    if (token) refreshStore.delete(token);
    return res.status(204).send();
  });

  

  // // Protected route
  // router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  //   try {
  //     const userId = req.user!.id;
  //     const result = await pool.query("SELECT id, name, email FROM users WHERE id=$1", [userId]);
  //     const user = result.rows[0];
  //     if (!user) {
  //       return res.status(404).json({
  //         success: false,
  //         data: null,
  //         message: null,
  //         errors: ["User not found"],
  //       });
  //     }

  //     return res.json({
  //       success: true,
  //       data: user,
  //       message: "User info retrieved successfully",
  //       errors: null,
  //     });
  //   } catch (err: any) {
  //     return res.status(500).json({
  //       success: false,
  //       data: null,
  //       message: null,
  //       errors: [err.message || "Internal server error"],
  //     });
  //   }
  // });

    // Protected route
  router.get("/me", authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await pool.query("SELECT id, name, email FROM users WHERE id=$1", [userId]);
      const user = result.rows[0];
      if (!user) {
        return res.status(404).json({
          success: false,
          data: null,
          message: null,
          errors: ["User not found"],
        });
      }

      return res.json({
        success: true,
        data: user,
        message: "User info retrieved successfully",
        errors: null,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        data: null,
        message: null,
        errors: [err.message || "Internal server error"],
      });
    }
  });


  // Protected route to get all users
router.get("/users", authenticateToken, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, name, email FROM users");
    return res.json({
      success: true,
      message: "All users retrieved successfully.",
      data: result.rows,
      errors: null
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      data: null,
      message: null,
      errors: [err.message || "Internal server error"],
    });
  }
});

  // Protected paginated products route
  router.post("/products/get-all", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { pageNumber = 1, pageSize = 10, orderBy = ["id"], search = "" } = req.body || {};
      const offset = (pageNumber - 1) * pageSize;
      // Sanitize orderBy fields (allow only certain columns)
      const allowedOrderFields = ["id", "name", "price", "description"];
      const orderClause = orderBy
        .filter((field: string) => allowedOrderFields.includes(field))
        .map((field: string) => `${field} ASC`)
        .join(", ") || "id ASC";

      // Build search filter
      let whereClause = "";
      let params: any[] = [];
      if (search && search.trim() !== "") {
        whereClause = "WHERE name ILIKE $1 OR description ILIKE $1";
        params.push(`%${search}%`);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
      const countResult = await pool.query(countQuery, params);
      const totalCount = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalCount / pageSize);

      // Get paginated data
      let dataQuery = `SELECT * FROM products ${whereClause} ORDER BY ${orderClause} OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
      const dataParams = [...params, offset, pageSize];
      const dataResult = await pool.query(dataQuery, dataParams);

      return res.json({
        success: true,
        message: "Products retrieved successfully.",
        data: {
          data: dataResult.rows,
          currentPage: pageNumber,
          totalPages,
          totalCount,
          pageSize,
          hasPreviousPage: pageNumber > 1,
          hasNextPage: pageNumber < totalPages
        },
        errors: null
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        data: null,
        message: null,
        errors: [err.message || "Internal server error"],
      });
    }
  });

  // Protected route to get all products (for client-side pagination)
  router.get("/products/all", authenticateToken, async (_req: Request, res: Response) => {
    try {
      // You may want to set a reasonable limit to avoid returning too much data
      const result = await pool.query("SELECT * FROM products LIMIT 1000");
      return res.json({
        success: true,
        message: "All products retrieved successfully.",
        data: result.rows,
        errors: null
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        data: null,
        message: null,
        errors: [err.message || "Internal server error"],
      });
    }
  });

  // Protected add-product route
  router.post("/add-product", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { name, price, description } = req.body;
      if (!name || !price) {
        return res.status(400).json({
          success: false,
          data: null,
          message: null,
          errors: ["Product name and price are required"],
        });
      }
      // Example: insert into 'products' table
      await pool.query(
        "INSERT INTO products (name, price, description) VALUES ($1, $2, $3)",
        [name, price, description || null]
      );
      return res.json({
        success: true,
        data: null,
        message: "Product added successfully",
        errors: null,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        data: null,
        message: null,
        errors: [err.message || "Internal server error"],
      });
    }
  });

  return router;
}
