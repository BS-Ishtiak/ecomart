"use client";

import React, { useEffect, useState } from "react";
import { Container,Box, Typography, List, ListItem, Paper } from "@mui/material";
import { useAuth } from "../auth-context";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  name: string;

}

export default function UsersPage() {
  const { loggedIn } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();


  const { accessToken, refreshToken, setAccessToken, setLoggedIn } = useAuth();

  async function authFetch(url: string) {
    let res = await fetch(url, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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
              headers: { Authorization: `Bearer ${data.data.accessToken}` },
            });
          } else {
            setLoggedIn(false);
            router.push("/login");
            return null;
          }
        } else {
          setLoggedIn(false);
          router.push("/login");
          return null;
        }
      } else {
        setLoggedIn(false);
        router.push("/login");
        return null;
      }
    }
    return res;
  }

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const res = await authFetch("http://localhost:5000/users");
        if (!res || !res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data.data || data.users || data);
      } catch {
        setError("Could not load users");
      }
    })();
  }, [accessToken, refreshToken, setAccessToken, setLoggedIn, router]);

  if (error) return <div>{error}</div>;

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h4" component="h2" gutterBottom fontWeight="bold">
        Users
      </Typography>
      <List>
        {users.map((user) => (
          <ListItem key={user.id} disablePadding>
            <Paper sx={{ p: 2, width: '100%' }}>
              {user.name}
            </Paper>
          </ListItem>
        ))}
      </List>
    </Container>
  );
}
