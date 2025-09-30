"use client";
import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../auth-context";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';

export default function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setLoggedIn, setAccessToken, setRefreshToken, setRole } = useAuth();

  // Auto-retry wrapper for promises
  const autoRetry = async (fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> => {
    try {
      return await fn();
    } catch (err) {
      if (retries > 0) {
        await new Promise(res => setTimeout(res, delay));
        return autoRetry(fn, retries - 1, delay);
      }
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await autoRetry(() =>
        axios.post("http://localhost:5000/login", { email, password })
      );
      if (res.status === 200 && res.data.accessToken && res.data.refreshToken) {
        setAccessToken(res.data.accessToken);
        setRefreshToken(res.data.refreshToken);
        setLoggedIn(true);
        if (res.data.data?.role) {
          setRole(res.data.data.role);
        } else {
          setRole(null);
        }
        onLogin();
      } else {
        setError(res.data.errors?.[0] || res.data.message || "Login failed");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.errors?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        "Network error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          bgcolor: 'background.paper',
          p: 4,
          borderRadius: 3,
          boxShadow: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          maxWidth: 350,
          mx: 'auto',
          my: 6,
        }}
      >
        <Typography variant="h5" align="center" fontWeight={700} gutterBottom>
          Login
        </Typography>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          variant="outlined"
          autoComplete="email"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          variant="outlined"
          autoComplete="current-password"
        />
        <Button
          type="submit"
          disabled={loading}
          variant="contained"
          color="primary"
          sx={{ fontWeight: 500, py: 1.5 }}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
        {error && <Alert severity="error" sx={{ textAlign: 'center' }}>{error}</Alert>}
      </Box>
      <Typography align="center" mt={2}>
        Don't have an account?{' '}
        <Link href="/signup" color="primary" underline="hover">
          Sign up
        </Link>
      </Typography>
    </>
  );
}
