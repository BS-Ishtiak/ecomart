import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import type { Pool } from "pg";
import type jwt from "jsonwebtoken";
import { logErrorToAuditDb, logUpdateToAuditDb } from '../server';

interface SignupBody {
  name: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface TokenBody {
  token: string;
}

type AccessTokenPayload = { id: number; email: string; name?: string; role: string };
type RefreshTokenPayload = { id: number; email: string; role: string };

const isValidPassword = (password: string): boolean => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
};

// Get products - simple endpoint
const getProducts = (_req: Request, res: Response) =>
  res.json({ success: true, data: null, message: "Server running", errors: null });

// Signup handler - factory function
const createUsers = (pool: Pool) => async (req: Request<{}, {}, SignupBody & { role?: string }>, res: Response) => {
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
    return res.status(201).json({
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
    console.error("Signup error:", err?.message || err);
    return res.status(500).json({
      success: false,
      data: null,
      message: null,
      errors: ["Server error"],
    });
  }
};

// Seed admin user handler - factory function
const createAdminUser = (pool: Pool) => async (_req: Request, res: Response) => {
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
};

// Login handler - factory function
const authorizeUser = (
  pool: Pool,
  signAccessToken: (payload: AccessTokenPayload) => string,
  signRefreshToken: (payload: RefreshTokenPayload) => string,
  refreshStore: Set<string>
) => async (req: Request<{}, {}, LoginBody>, res: Response) => {
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
};

// Delete product handler
const deleteProduct = (pool: Pool) => async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    // @ts-ignore: custom user property injected by authenticateToken
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    await pool.query("DELETE FROM products WHERE id = $1", [productId]);
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
};

// Update product handler
const updateProduct = (pool: Pool) => async (req: Request, res: Response) => {
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
};

// Refresh token handler
const refreshTokenHandler = (
  pool: Pool,
  signAccessToken: (payload: AccessTokenPayload) => string,
  jwtLib: typeof jwt
) => async (req: Request<{}, {}, TokenBody>, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: null,
      errors: ["Missing refresh token"],
    });
  }

  jwtLib.verify(token, process.env.REFRESH_TOKEN_SECRET || "CHANGE_ME_refresh_secret_!@#", async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        data: null,
        message: null,
        errors: ["Invalid or expired refresh token"],
      });
    }
    const payload = decoded as { id: number; email: string };
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
};

// Logout handler
const logoutHandler = (refreshStore: Set<string>) => (req: Request<{}, {}, TokenBody>, res: Response) => {
  const { token } = req.body;
  if (token) refreshStore.delete(token);
  return res.status(204).send();
};

// Get user info handler
const meHandler = (pool: Pool) => async (req: Request, res: Response) => {
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
};

// Get all users handler
const getAllUsersHandler = (pool: Pool) => async (_req: Request, res: Response) => {
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
};

// Get paginated products handler
const getPaginatedProductsHandler = (pool: Pool) => async (req: Request, res: Response) => {
  try {
    const { pageNumber = 1, pageSize = 10, orderBy = ["id"], search = "" } = req.body || {};
    const offset = (pageNumber - 1) * pageSize;
    const allowedOrderFields = ["id", "name", "price", "description"];
    const orderClause = orderBy
      .filter((field: string) => allowedOrderFields.includes(field))
      .map((field: string) => `${field} ASC`)
      .join(", ") || "id ASC";

    let whereClause = "";
    let params: any[] = [];
    if (search && search.trim() !== "") {
      whereClause = "WHERE name ILIKE $1 OR description ILIKE $1";
      params.push(`%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalCount / pageSize);

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
};

// Get all products handler
const getAllProductsHandler = (pool: Pool) => async (_req: Request, res: Response) => {
  try {
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
};

// Add product handler
const addProductHandler = (pool: Pool) => async (req: Request, res: Response) => {
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
};

export {
  getProducts,
  createUsers,
  createAdminUser,
  authorizeUser,
  deleteProduct,
  updateProduct,
  refreshTokenHandler,
  logoutHandler,
  meHandler,
  getAllUsersHandler,
  getPaginatedProductsHandler,
  getAllProductsHandler,
  addProductHandler
};
