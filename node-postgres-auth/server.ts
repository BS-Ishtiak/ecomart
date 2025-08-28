import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

//CONFIG (edit these)
const PORT = 5000;
const ACCESS_TOKEN_SECRET = "CHANGE_ME_access_secret_!@#";  // use env vars in real apps
const REFRESH_TOKEN_SECRET = "CHANGE_ME_refresh_secret_!@#"; // use env vars in real apps
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";


const app = express();
app.use(express.json()); // body parser for JSON

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

// custom shape of req(req.user)
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; name?: string; iat?: number; exp?: number };
    }
  }
}
// custom types
//Used when a new user signs up,log in,token body
//req.body will only allow the properties defined in your type.

type SignupBody = { name: string; email: string; password: string };
type LoginBody = { email: string; password: string };
type TokenBody = { token: string };

// Set stores unique refresh tokens
const refreshStore = new Set<string>();

// jwt.sign creates a JWT
//signAccessToken and signRefreshToken functions take a user object
function signAccessToken(payload: { id: number; email: string; name?: string }) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}
function signRefreshToken(payload: { id: number; email: string }) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

// Express middleware that checks if the request has a valid JWT access token.
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("authorization"); // "Bearer <token>"
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: "Missing access token" });

  //req.user now contains the info from the token (id, email, etc.)
  //next() → moves to the next middleware or route handler.
  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired access token" });
    req.user = decoded as any;
    next();
  });
}
//ROUTES 

// Health
app.get("/", (_req, res) => res.json({ ok: true }));

// Signup
app.post("/signup", async (req: Request<{}, {}, SignupBody>, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "name, email, password are required" });

  const hashed = await bcrypt.hash(password, 10);
  try {
    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashed]
    );
    return res.json({ message: "User registered successfully!" });
  } catch (err: any) {
    // Unique violation code in Postgres is '23505'
    if (err?.code === "23505") {
      return res.status(400).json({ error: "Email already exists!" });
    }
    console.error("Signup error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// Login -> returns access & refresh tokens
app.post("/login", async (req: Request<{}, {}, LoginBody>, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });
// Queries the users table for the given email.
  const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if (result.rows.length === 0) return res.status(400).json({ error: "User not found!" });

  const user = result.rows[0] as { id: number; name: string; email: string; password: string };
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "Invalid password!" });

  const accessToken = signAccessToken({ id: user.id, email: user.email, name: user.name });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email });

  refreshStore.add(refreshToken);
  return res.json({ accessToken, refreshToken });
});

// Refresh -> accepts refresh token, returns new access token
app.post("/token", (req: Request<{}, {}, TokenBody>, res: Response) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: "Missing refresh token" });
  if (!refreshStore.has(token)) return res.status(403).json({ error: "Refresh token not recognized" });

  jwt.verify(token, REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired refresh token" });
    const payload = decoded as { id: number; email: string };
    const newAccess = signAccessToken({ id: payload.id, email: payload.email });
    return res.json({ accessToken: newAccess });
  });
});

// Logout -> invalidates refresh token
app.post("/logout", (req: Request<{}, {}, TokenBody>, res: Response) => {
  const { token } = req.body;
  if (token) refreshStore.delete(token);
  return res.status(204).send();
});

// This route uses authenticateToken middleware.
// If the access token is valid, req.user is set, and this returns the user payload (id, email, name).
app.get("/me", authenticateToken, (req: Request, res: Response) => {
  return res.json({ user: req.user });
});

// ====== START ======
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
