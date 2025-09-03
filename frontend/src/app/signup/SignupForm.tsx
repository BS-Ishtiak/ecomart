"use client";
import React, { useState } from "react";
import axios from "axios";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

export default function SignupForm({ onSignup }: { onSignup: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      try {
        const res = await axios.post(
          "http://localhost:5000/signup",
          { name, email, password }
        );
        if (res.status === 200 && res.data.success) {
          setSuccess("Signup successful! You can now log in.");
          onSignup();
        } else {
          setError(res.data.errors?.[0] || res.data.message || "Signup failed");
        }
      } catch (err: any) {
        setError(
          err.response?.data?.errors?.[0] ||
            err.response?.data?.message ||
            "Signup failed"
        );
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
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
        Sign Up
      </Typography>
      <TextField
        label="Name"
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        variant="outlined"
        autoComplete="name"
      />
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
        autoComplete="new-password"
      />
      <Button
        type="submit"
        disabled={loading}
        variant="contained"
        color="primary"
        sx={{ fontWeight: 500, py: 1.5 }}
      >
        {loading ? "Signing up..." : "Sign Up"}
      </Button>
      {error && <Alert severity="error" sx={{ textAlign: 'center' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ textAlign: 'center' }}>{success}</Alert>}
    </Box>
  );
}
