"use client";

import React from "react";
import { useAuth } from "./auth-context";
import Navbar from "../components/Navbar";
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export default function LayoutWithLoading({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="white">
        <Box display="flex" flexDirection="column" alignItems="center">
          <CircularProgress color="primary" />
          <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
            Loading ..........
          </Typography>
        </Box>
      </Box>
    );
  }
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}