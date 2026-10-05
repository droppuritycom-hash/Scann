'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { InventoryItem } from '@/types';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [batch, setBatch] = useState('');
  const [kit, setKit] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Category and Batch/Kit options
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/products?limit=250')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        sort,
      });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (batch) params.set('batch', batch);
      if (kit) params.set('kit', kit);
      if (status) params.set('status', status);

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();

      setItems(data.items || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, batch, kit, status, sort]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInventory();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setBatch('');
    setKit('');
    setStatus('');
    setSort('desc');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-xl font-black text-[#111111] flex items-center gap-2">
            <Boxes className="w-5 h-5" />
            Serialized Inventory ({totalCount})
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Complete registry of physical parts, assigned batches, and kit allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInventory()}
            className="p-2 border border-[#E5E5E5] rounded hover:bg-neutral-100 text-[#111111] text-xs font-semibold flex items-center gap-1 transition"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/scan"
            className="px-3 py-1.5 bg-black text-white rounded text-xs font-bold hover:bg-neutral-800 transition"
          >
            + Scan New Product
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E5E5E5] rounded p-3 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search serial (A00001), product, part code, batch, or kit..."
              className="w-full text-xs pl-8 pr-3 py-2 border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-mono"
            />
            <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1.5 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1.5 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black"
          >
            <option value="">All Statuses</option>
            <option value="in_batch">In Batch (Unassigned to Kit)</option>
            <option value="in_kit">In Kit</option>
            <option value="dispatched">Dispatched</option>
            <option value="scrapped">Scrapped</option>
          </select>

          {/* Sort Order */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as 'desc' | 'asc');
              setPage(1);
            }}
            className="px-2 py-1.5 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black"
          >
            <option value="desc">Sort: Newest First</option>
            <option value="asc">Sort: Oldest First</option>
          </select>

          {/* Reset Filters */}
          {(search || category || batch || kit || status) && (
            <button
              onClick={handleResetFilters}
              type="button"
              className="col-span-2 sm:col-span-1 px-3 py-1.5 border border-[#E5E5E5] rounded text-xs font-semibold text-[#666666] hover:bg-neutral-100 transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View (Section 33) */}
      <div className="hidden md:block bg-white border border-[#E5E5E5] rounded overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-[#E5E5E5] text-[#666666] font-semibold">
              <th className="py-2.5 px-3 font-mono">Serial</th>
              <th className="py-2.5 px-3">Product Name</th>
              <th className="py-2.5 px-3 font-mono">Part Code</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3 font-mono">Batch</th>
              <th className="py-2.5 px-3 font-mono">Kit</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Registered</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[#888888]">
                  Loading inventory data...
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((item) => (
                <tr key={item.serialCode} className="hover:bg-neutral-50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#111111]">
                    {item.serialCode}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#111111]">
                    {item.productName}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#666666]">
                    {item.partCode}
                  </td>
                  <td className="py-2.5 px-3 text-[#666666]">
                    {item.category || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <Link
                      href={`/batches/${item.batchCode}`}
                      className="text-[#111111] hover:underline font-semibold"
                    >
                      {item.batchCode}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {item.kitCode ? (
                      <Link
                        href={`/kits/${item.kitCode}`}
                        className="text-black font-semibold hover:underline"
                      >
                        {item.kitCode}
                      </Link>
                    ) : (
                      <span className="text-[#888888]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'in_kit'
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-[#111111] border border-[#E5E5E5]'
                      }`}
                    >
                      {item.status === 'in_kit' ? 'In Kit' : 'In Batch'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#888888] font-mono text-[11px]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      href={`/search?q=${item.serialCode}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-black hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[#888888]">
                  No inventory items found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View (Section 33: On mobile convert the table into cards) */}
      <div className="md:hidden space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#888888] bg-white border border-[#E5E5E5] rounded">
            Loading inventory items...
          </div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.serialCode}
              className="p-3 bg-white border border-[#E5E5E5] rounded space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-sm text-[#111111]">
                  {item.serialCode}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    item.status === 'in_kit'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-[#111111] border border-[#E5E5E5]'
                  }`}
                >
                  {item.status === 'in_kit' ? 'In Kit' : 'In Batch'}
                </span>
              </div>

              <div>
                <div className="font-bold text-[#111111]">{item.productName}</div>
                <div className="text-[11px] text-[#666666] font-mono">{item.partCode}</div>
              </div>

              <div className="grid grid-cols-2 gap-1 pt-2 border-t border-[#E5E5E5] text-[11px]">
                <div>
                  <span className="text-[#888888] block">Batch:</span>
                  <Link href={`/batches/${item.batchCode}`} className="font-mono font-semibold text-black underline">
                    {item.batchCode}
                  </Link>
                </div>
                <div>
                  <span className="text-[#888888] block">Kit:</span>
                  {item.kitCode ? (
                    <Link href={`/kits/${item.kitCode}`} className="font-mono font-semibold text-black underline">
                      {item.kitCode}
                    </Link>
                  ) : (
                    <span className="text-[#888888]">Not assigned</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] text-[11px]">
                <span className="text-[#888888]">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <Link
                  href={`/search?q=${item.serialCode}`}
                  className="font-bold text-black flex items-center gap-1"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-[#888888] bg-white border border-[#E5E5E5] rounded">
            No items found.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <div className="text-[#666666]">
            Page {page} of {totalPages} ({totalCount} total items)
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-[#E5E5E5] rounded font-semibold text-[#111111] hover:bg-neutral-100 disabled:opacity-40 transition flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 border border-[#E5E5E5] rounded font-semibold text-[#111111] hover:bg-neutral-100 disabled:opacity-40 transition flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
