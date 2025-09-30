"use client";

import React, { useEffect, useState } from "react";
import { useRef } from "react";
import { useAuth } from "../auth-context";

async function authFetchPaginated(
  url: string,
  body: any,
  accessToken: string | null,
  refreshToken: string | null,
  setAccessToken: (t: string | null) => void,
  setLoggedIn: (v: boolean) => void
) {
  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
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
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.data.accessToken}`,
            },
            body: JSON.stringify(body),
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

export default function ProductsPage() {
  // Modal state for update
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateProduct, setUpdateProduct] = useState<any | null>(null);
  const [updateName, setUpdateName] = useState("");
  const [updateDescription, setUpdateDescription] = useState("");
  const [updatePrice, setUpdatePrice] = useState("");

  // Admin handlers
  async function handleDelete(id: number) {
    if (!accessToken) return;
    try {
      const res = await fetch(`http://localhost:5000/products/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
      } else {
        setError("Failed to delete product");
      }
    } catch {
      setError("Failed to delete product");
    }
  }

  async function handleUpdate(id: number) {
    const product = products.find(p => p.id === id);
    if (product) {
      setUpdateProduct(product);
      setUpdateName(product.name || "");
      setUpdateDescription(product.description || "");
      setUpdatePrice(product.price?.toString() || "");
      setShowUpdateModal(true);
    }
  }

  async function submitUpdate() {
    if (!accessToken || !updateProduct) return;
    try {
      const res = await fetch(`http://localhost:5000/products/${updateProduct.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: updateName,
          description: updateDescription,
          price: Number(updatePrice),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts(products.map(p => p.id === updateProduct.id ? { ...p, ...updated.data } : p));
        setShowUpdateModal(false);
        setUpdateProduct(null);
      } else {
        setError("Failed to update product");
      }
    } catch {
      setError("Failed to update product");
    }
  }
  const { accessToken, refreshToken, setAccessToken, setLoggedIn, role } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetchPaginated(
          "http://localhost:5000/products/get-all",
          { pageNumber: currentPage, pageSize, orderBy: ["name"], search: debouncedSearch },
          accessToken,
          refreshToken,
          setAccessToken,
          setLoggedIn
        );
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        setProducts(data.data?.data || []);
        setTotalPages(data.data?.totalPages || 1);
      } catch {
        setError("Could not load products");
      }
    })();
  }, [accessToken, refreshToken, setAccessToken, setLoggedIn, currentPage, pageSize, debouncedSearch]);

  // Reset to page 1 if pageSize or debouncedSearch changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, debouncedSearch]);

  // Debounce search input
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [search]);

  if (error) return <div>{error}</div>;

  return (
    <div className="max-w-3xl mx-auto my-10 bg-white rounded-2xl shadow-lg p-8">
      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <h3 className="text-xl font-bold mb-4">Update Product</h3>
            <label className="block mb-2 font-medium">Name</label>
            <input
              type="text"
              value={updateName}
              onChange={e => setUpdateName(e.target.value)}
              className="border rounded px-2 py-1 w-full mb-3"
            />
            <label className="block mb-2 font-medium">Description</label>
            <textarea
              value={updateDescription}
              onChange={e => setUpdateDescription(e.target.value)}
              className="border rounded px-2 py-1 w-full mb-3"
            />
            <label className="block mb-2 font-medium">Price</label>
            <input
              type="number"
              value={updatePrice}
              onChange={e => setUpdatePrice(e.target.value)}
              className="border rounded px-2 py-1 w-full mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
                onClick={() => { setShowUpdateModal(false); setUpdateProduct(null); }}
              >Cancel</button>
              <button
                className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                onClick={submitUpdate}
              >Update</button>
            </div>
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl"
              onClick={() => { setShowUpdateModal(false); setUpdateProduct(null); }}
              title="Close"
            >×</button>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-bold mb-6 text-gray-900 tracking-wide text-center">Products</h2>
      {/* Search Bar */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative w-full max-w-xs flex items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full pr-8"
            />
            {/* Ascending order arrow icon */}
            <span title="Ascending order" className="absolute right-2 text-gray-500 text-lg pointer-events-none select-none" style={{top: '50%', transform: 'translateY(-50%)'}}>
              &#8593;
            </span>
          </div>
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
          {[5, 10, 20, 50].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 bg-gray-50 rounded-xl shadow-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-2 font-semibold text-gray-700 border-b-2 border-gray-200 text-left">Name</th>
              <th className="py-3 px-2 font-semibold text-gray-700 border-b-2 border-gray-200 text-left">Description</th>
              <th className="py-3 px-2 font-semibold text-gray-700 border-b-2 border-gray-200 text-left">Price</th>
              {role === "admin" && <th className="py-3 px-2 font-semibold text-gray-700 border-b-2 border-gray-200 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => (
              <tr key={p.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100 transition'}>
                <td className="py-2 px-2 border-b border-gray-100 max-w-xs truncate" title={p.name}>{p.name}</td>
                <td className="py-2 px-2 border-b border-gray-100 max-w-md truncate" title={p.description}>{p.description || <span className='italic text-gray-400'>No description</span>}</td>
                <td className="py-2 px-2 border-b border-gray-100">{typeof p.price !== 'undefined' ? `৳${p.price}` : ''}</td>
                {role === "admin" && (
                  <td className="py-2 px-2 border-b border-gray-100">
                    <button className="mr-2 px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600" onClick={() => handleDelete(p.id)}>Delete</button>
                    <button className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600" onClick={() => handleUpdate(p.id)}>Update</button>
                  </td>
                )}
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={role === "admin" ? 4 : 3} className="text-center py-6 text-gray-400">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-7 gap-4">
        <button
          className="px-5 py-2 rounded-md font-semibold transition-colors border-none focus:outline-none bg-gray-200 text-gray-400 cursor-pointer disabled:opacity-50"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="font-medium text-gray-700 text-base">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="px-5 py-2 rounded-md font-semibold transition-colors border-none focus:outline-none bg-gray-200 text-gray-400 cursor-pointer disabled:opacity-50"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
