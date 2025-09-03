"use client";
import React from "react";
import { useAuth } from "./auth-context";
import Navbar from "../components/Navbar";

export default function LayoutWithLoading({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-blue-600 text-2xl">Loading ..........</div>
      </div>
    );
  }
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}