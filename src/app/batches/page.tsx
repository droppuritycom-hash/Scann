'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, Search, RefreshCw, Plus, ExternalLink } from 'lucide-react';
import { Batch } from '@/types';

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const res = await fetch(`/api/batches?${params.toString()}`);
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBatches();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-xl font-black text-[#111111] flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Batch Management ({batches.length})
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Production batches and serialized item registrations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/qr-generator"
            className="px-3 py-1.5 border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded hover:bg-neutral-100 transition"
          >
            Generate Batch QR
          </Link>
          <Link
            href="/scan"
            className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
          >
            + Scan Batch
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
              placeholder="Search batch code (e.g. BAT-A00001)..."
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

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs px-3 py-2 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Batches Table (Section 35) */}
      <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-[#E5E5E5] text-[#666666] font-semibold">
              <th className="py-2.5 px-3 font-mono">Batch Code</th>
              <th className="py-2.5 px-3 font-mono">Base Code</th>
              <th className="py-2.5 px-3">Products Registered</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Created Date</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#888888]">
                  Loading batches...
                </td>
              </tr>
            ) : batches.length > 0 ? (
              batches.map((b) => (
                <tr key={b.code} className="hover:bg-neutral-50 transition">
                  <td className="py-2.5 px-3 font-mono font-black text-[#111111]">
                    <Link href={`/batches/${b.code}`} className="hover:underline flex items-center gap-1.5">
                      {b.code}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#666666]">
                    {b.baseCode}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[#111111]">
                    {b.productCount || 0}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'open'
                          ? 'bg-neutral-100 text-black border border-[#E5E5E5]'
                          : 'bg-neutral-900 text-white'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[#888888] font-mono text-[11px]">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      href={`/batches/${b.code}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-black hover:underline"
                    >
                      View Items →
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#888888]">
                  No batches created yet. Scan or generate a batch QR to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
