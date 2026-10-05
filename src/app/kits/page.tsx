'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Search, RefreshCw, Plus, ExternalLink } from 'lucide-react';
import { Kit } from '@/types';

export default function KitsPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const fetchKits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const res = await fetch(`/api/kits?${params.toString()}`);
      const data = await res.json();
      setKits(data.kits || []);
    } catch (err) {
      console.error('Failed to fetch kits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKits();
  }, [status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKits();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-xl font-black text-[#111111] flex items-center gap-2">
            <Package className="w-5 h-5" />
            Kit Management ({kits.length})
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Assembled product kits, buckets, and component bundles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/qr-generator"
            className="px-3 py-1.5 border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded hover:bg-neutral-100 transition"
          >
            Generate Kit QR
          </Link>
          <Link
            href="/scan"
            className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
          >
            + Scan Kit
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-[#E5E5E5] rounded p-3 flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search kit code (e.g. KIT-A00001)..."
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

        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="flex-1 sm:flex-none text-xs px-3 py-2 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          {(search || status) && (
            <button
              onClick={() => {
                setSearch('');
                setStatus('');
              }}
              className="px-3 py-2 border border-[#E5E5E5] rounded text-xs text-[#666666] hover:bg-neutral-100 transition shrink-0"
              title="Clear filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Desktop Kits Table (Hidden on mobile) */}
      <div className="hidden md:block bg-white border border-[#E5E5E5] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-neutral-50 border-b border-[#E5E5E5] text-[#666666] font-semibold">
                <th className="py-2.5 px-3 font-mono">Kit Code</th>
                <th className="py-2.5 px-3">Items Assembled</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#888888]">
                    Loading kits...
                  </td>
                </tr>
              ) : kits.length > 0 ? (
                kits.map((k) => (
                  <tr key={k.code} className="hover:bg-neutral-50 transition">
                    <td className="py-2.5 px-3 font-mono font-black text-[#111111]">
                      <Link href={`/kits/${k.code}`} className="hover:underline flex items-center gap-1.5">
                        {k.code}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#111111]">
                      {k.itemCount || 0}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          k.status === 'open'
                            ? 'bg-neutral-100 text-black border border-[#E5E5E5]'
                            : 'bg-neutral-900 text-white'
                        }`}
                      >
                        {k.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#888888] font-mono text-[11px]">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/kits/${k.code}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-black hover:underline"
                      >
                        View Kit Items →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#888888]">
                    No kits created yet. Scan or generate a kit QR to begin assembling.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Kits Cards View (Visible on mobile screens < md) */}
      <div className="md:hidden space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#888888] bg-white border border-[#E5E5E5] rounded">
            Loading kits...
          </div>
        ) : kits.length > 0 ? (
          kits.map((k) => (
            <div
              key={k.code}
              className="p-3.5 bg-white border border-[#E5E5E5] rounded space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/kits/${k.code}`}
                  className="font-mono font-black text-sm text-[#111111] hover:underline"
                >
                  {k.code}
                </Link>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    k.status === 'open'
                      ? 'bg-neutral-100 text-black border border-[#E5E5E5]'
                      : 'bg-neutral-900 text-white'
                  }`}
                >
                  {k.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#F0F0F0]">
                <span className="text-[#888888]">Items Assembled:</span>
                <span className="font-bold text-[#111111]">{k.itemCount || 0} units</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#F0F0F0] text-[11px]">
                <span className="text-[#888888] font-mono">
                  {new Date(k.createdAt).toLocaleDateString()}
                </span>
                <Link
                  href={`/kits/${k.code}`}
                  className="px-3 py-1 bg-black text-white text-[11px] font-bold rounded hover:bg-neutral-800 transition"
                >
                  View Kit Items →
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-[#888888] bg-white border border-[#E5E5E5] rounded">
            No kits created yet. Scan or generate a kit QR to begin assembling.
          </div>
        )}
      </div>
    </div>
  );
}
