"use client";

import React, { useState } from "react";
import { useAuth } from "../auth-context";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

async function authFetch
 (url: string, 
  options: any, 
  accessToken: string | null, 
  refreshToken: string | null, 
  setAccessToken: (t: string | null) => void, 
  setLoggedIn: (v: boolean) => void) {

  let res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    // Try refresh
    if (refreshToken) {
      const refreshRes = await fetch("http://localhost:5000/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data.data?.accessToken) {
          setAccessToken(data.data.accessToken);
          // Retry original request
          res = await fetch(url, {
            ...options,
            headers: {
              ...(options.headers || {}),
              Authorization: `Bearer ${data.data.accessToken}`,
            },
          });
        } else {
          setLoggedIn(false);
        }
      } else {
        setLoggedIn(false);
      }
    } else {
      setLoggedIn(false);
    }
  }
  return res;
}

export default function AddProductPage() {
  const { accessToken, refreshToken, setAccessToken, setLoggedIn } = useAuth();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await authFetch(
        "http://localhost:5000/add-product",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, price, description }),
        },
        accessToken,
        refreshToken,
        setAccessToken,
        setLoggedIn
      );
      if (!res.ok) throw new Error("Failed to add product");
      setSuccess("Product added!");
      setName("");
      setPrice("");
      setDescription("");
    } catch {
      setError("Could not add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3, boxShadow: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Add Product
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          variant="outlined"
        />
        <TextField
          label="Price"
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
          variant="outlined"
        />
        <TextField
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          variant="outlined"
        />
        <Button
          type="submit"
          disabled={loading}
          variant="contained"
          color="primary"
        >
          {loading ? "Adding..." : "Add Product"}
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
      </Box>
    </Box>
  );
}
