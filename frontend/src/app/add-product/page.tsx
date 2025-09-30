"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

  // Zod schema for product
  const productSchema = z.object({
    name: z.string().min(1, "Name is required"),
    price: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Price must be a positive number",
      }),
    description: z.string().min(1, "Description is required"),
  });

  type ProductForm = z.infer<typeof productSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    trigger,
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    mode: "onChange",
  });

  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const onSubmit = async (data: ProductForm) => {
    setError("");
    setSuccess("");
    try {
      const res = await authFetch(
        "http://localhost:5000/add-product",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        accessToken,
        refreshToken,
        setAccessToken,
        setLoggedIn
      );
      if (!res.ok) throw new Error("Failed to add product");
      setSuccess("Product added!");
      reset();
    } catch {
      setError("Could not add product");
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3, boxShadow: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Add Product
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Name"
          {...register("name")}
          onChange={async (e) => {
            register("name").onChange(e);
            await trigger("name");
          }}
          error={!!errors.name}
          helperText={errors.name?.message}
          required
          variant="outlined"
        />
        <TextField
          label="Price"
          type="number"
          {...register("price")}
          onChange={async (e) => {
            register("price").onChange(e);
            await trigger("price");
          }}
          error={!!errors.price}
          helperText={errors.price?.message}
          required
          variant="outlined"
        />
        <TextField
          label="Description"
          {...register("description")}
          onChange={async (e) => {
            register("description").onChange(e);
            await trigger("description");
          }}
          error={!!errors.description}
          helperText={errors.description?.message}
          variant="outlined"
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          variant="contained"
          color="primary"
        >
          {isSubmitting ? "Adding..." : "Add Product"}
        </Button>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
      </Box>
    </Box>
  );
}
