"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../auth-context";
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";

interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
}



const Products1Page: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!accessToken) {
          setError("Not authenticated. Please log in.");
          setLoading(false);
          return;
        }
        const res = await fetch("http://localhost:5000/products/all", {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setProducts(data.data);
          setFilteredProducts(data.data);
        } else {
          setError(data.message || "Failed to fetch products");
        }
      } catch (err: any) {
        setError(err.message || "Error fetching products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [accessToken]);
  // Filter products client-side as search changes
  useEffect(() => {
    if (!search.trim()) {
      setFilteredProducts(products);
    } else {
      const lower = search.toLowerCase();
      setFilteredProducts(
        products.filter(p =>
          p.name.toLowerCase().includes(lower) ||
          (p.description && p.description.toLowerCase().includes(lower))
        )
      );
    }
    setCurrentPage(1);
  }, [search, products]);

  // Reset to page 1 if pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );


  return (
    <Box maxWidth="md" mx="auto" mt={10} component={Paper} p={4} borderRadius={4} boxShadow={3}>
      <Typography variant="h4" align="center" gutterBottom fontWeight={700} color="text.primary">
        Products <Typography component="span" variant="subtitle1" color="text.secondary" fontWeight={400}>(Client-side Pagination & Search)</Typography>
      </Typography>
      {/* Search Bar */}
      <Box mb={4} display="flex" alignItems="center" gap={2}>
        <TextField
          label="Search products"
          variant="outlined"
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
        />
        {search && (
          <Button variant="outlined" color="secondary" onClick={() => setSearch("")}>Clear</Button>
        )}
      </Box>
      <Box mb={4} display="flex" alignItems="center" gap={2}>
        <Typography fontWeight={500}>Page size:</Typography>
        <Select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          size="small"
        >
          {[5, 10, 15, 20].map(size => (
            <MenuItem key={size} value={size}>{size}</MenuItem>
          ))}
        </Select>
      </Box>
      {loading && <Typography color="primary" align="center" fontWeight={500}>Loading...</Typography>}
      {error && <Typography color="error" bgcolor="#fdd" p={2} borderRadius={2} align="center" fontWeight={500}>{error}</Typography>}
      <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 2, boxShadow: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><b>ID</b></TableCell>
              <TableCell><b>Name</b></TableCell>
              <TableCell><b>Price</b></TableCell>
              <TableCell><b>Description</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProducts.map((product, idx) => (
              <TableRow key={product.id} hover selected={false}>
                <TableCell>{product.id}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>৳{product.price}</TableCell>
                <TableCell>{product.description || <Typography color="text.disabled">—</Typography>}</TableCell>
              </TableRow>
            ))}
            {paginatedProducts.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.disabled' }}>No products found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box display="flex" alignItems="center" justifyContent="center" mt={5} gap={2}>
        <Button
          variant="contained"
          color="inherit"
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Typography fontWeight={500} color="text.secondary">
          Page {currentPage} of {totalPages}
        </Typography>
        <Button
          variant="contained"
          color="inherit"
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default Products1Page;
