"use client";
import React from "react";
import SignupForm from "./SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="max-w-sm mx-auto my-8">
      <SignupForm onSignup={() => {}} />
      <div className="text-center mt-4">
        Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
      </div>
    </div>
  );
}
