// components/NavItem.tsx
"use client";
import Link from "next/link";
import React from "react";

type NavItemProps = {
  href?: string;
  label: string;
  onClick?: () => void;
  isButton?: boolean;
  className?: string;
};

export default function NavItem({
  href,
  label,
  onClick,
  isButton = false,
  className = "",
}: NavItemProps) {
  if (isButton) {
    return (
      <button
        onClick={onClick}
        // className={`ml-3 bg-blue-900 text-white rounded px-4 py-2 text-base font-medium hover:bg-red-700 transition-colors ${className}`}
        className={`ml-3 text-gray-900 rounded px-2 py-1 text-base font-medium hover:bg-blue-100 transition-colors ${className}`}
      >
        {label}
      </button>
    );
  }

  return (
    <Link
      href={href || "#"}
      className={`text-gray-900 hover:bg-blue-100 font-medium ${className}`}
    >
      {label}
    </Link>
  );
}
