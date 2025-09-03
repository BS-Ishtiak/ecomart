"use client";

import React, { useState } from "react";
import LoginForm from "./LoginForm";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";

export default function LoginPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const { loading, setLoading } = useAuth();
  const handleLogin = () => {
    setLoggedIn(true);
    setShowSuccess(true);
    setLoading(true);
    setTimeout(() => {
      setShowSuccess(false);
      setLoading(false);
      router.push("/"); // Redirect to home page after login
    }, 1500);
  };

  return (
    <div className="max-w-sm mx-auto my-8">
      {showSuccess && !loading && (
        <div className="text-green-600 text-center mb-4">
          Login successful! Redirecting to home...
        </div>
      )}
      {!loading && <LoginForm onLogin={handleLogin} />}
    </div>
  );
}
