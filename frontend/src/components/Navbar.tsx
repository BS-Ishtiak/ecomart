
"use client";
import React, { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useAuth } from "../app/auth-context";


export default function Navbar() {
  const { loggedIn, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const publicLinks = [
    // { href: "/", label: "Home" },
    { href: "/login", label: "Login" },
    { href: "/signup", label: "Signup" },
  ];

  const privateLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Product" }, 
    { href: "/products1", label: "Products1" },
    { href: "/users", label: "Users" },
    { href: "/add-product", label: "Add Product" },
  ];

  const links = mounted && loggedIn ? privateLinks : publicLinks;

  return (
    <AppBar position="sticky" color="default" elevation={1} sx={{ mb: 4 }}>
      <Toolbar>
        <Stack direction="row" spacing={2} sx={{ flexGrow: 1 }}>
          {links.map((link) => (
            <Button
              key={link.href}
              href={link.href}
              color="inherit"
              sx={{ textTransform: "none" }}
            >
              {link.label}
            </Button>
          ))}
        </Stack>
        {loggedIn && (
          <Button color="error" onClick={logout} sx={{ textTransform: "none" }}>
            Logout
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
