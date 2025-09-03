"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../auth-context";

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
    <div className="max-w-3xl mx-auto mt-10 bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 tracking-wide text-center">
        Products <span className="font-normal text-lg text-gray-400">(Client-side Pagination & Search)</span>
      </h1>
      {/* Search Bar */}
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full max-w-xs"
        />
        {search && (
          <button
            type="button"
            className="ml-2 px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            onClick={() => setSearch("")}
          >
            Clear
          </button>
        )}
      </div>
      <div className="mb-6 flex items-center gap-3">
        <label className="font-medium">Page size:</label>
        <select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {[5, 10, 15, 20].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      {loading && <p className="text-blue-600 text-center font-medium">Loading...</p>}
      {error && <p className="text-red-700 bg-red-100 p-3 rounded-lg text-center font-medium">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full mt-6 border-separate border-spacing-0 bg-gray-50 rounded-xl shadow-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-2 font-semibold text-gray-700 border-b-2 border-gray-200 text-left">ID</th>
              <th className="py-3 px-2 font-semibold text-gray-700 border-b-2 border-gray-200 text-left">Name</th>
              <th className="py-3 px-2 font-semibold text-gray-700 border-b-2 border-gray-200 text-left">Price</th>
              <th className="py-3 px-2 font-semibold text-gray-700 border-b-2 border-gray-200 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product, idx) => (
              <tr key={product.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100 transition'}>
                <td className="py-2 px-2 border-b border-gray-100">{product.id}</td>
                <td className="py-2 px-2 border-b border-gray-100">{product.name}</td>
                <td className="py-2 px-2 border-b border-gray-100">৳{product.price}</td>
                <td className="py-2 px-2 border-b border-gray-100">{product.description || <span className="text-gray-300">—</span>}</td>
              </tr>
            ))}
            {paginatedProducts.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-400">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-center mt-7 gap-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className={`px-5 py-2 rounded-md font-semibold transition-colors border-none focus:outline-none ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'}`}
        >
          Previous
        </button>
        <span className="font-medium text-gray-700 text-base">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={`px-5 py-2 rounded-md font-semibold transition-colors border-none focus:outline-none ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'}`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Products1Page;
