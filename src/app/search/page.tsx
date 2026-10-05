'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Boxes,
  Layers,
  Package,
  History,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import QRCodeCard from '@/components/qr/QRCodeCard';
import { InventoryItem, Batch, Kit, AuditLog } from '@/types';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type?: 'serial' | 'batch' | 'kit';
    found?: boolean;
    message?: string;
    item?: InventoryItem;
    batch?: Batch;
    kit?: Kit;
    products?: InventoryItem[];
    productCount?: number;
    itemCount?: number;
    history?: AuditLog[];
    qrDataUrl?: string;
  } | null>(null);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim().toUpperCase())}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ found: false, message: 'Failed to perform search' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setInputQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(inputQuery);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header & Search Bar */}
      <div className="space-y-3 pb-4 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-xl font-black text-[#111111] flex items-center gap-2">
            <SearchIcon className="w-5 h-5" />
            Universal QR Identifier Search
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Instant lookup for Serials (e.g. A00001), Batches (e.g. BAT-A00001), or Kits (e.g. KIT-A00001)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Enter exact QR code (e.g. A00001, BAT-A00001, KIT-A00001)..."
              className="w-full text-sm pl-9 pr-3 py-2.5 border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-mono"
            />
            <SearchIcon className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
          >
            {loading ? 'Searching...' : 'Lookup'}
          </button>
        </form>
      </div>

      {/* Search Results Display */}
      {result && (
        <div className="space-y-4">
          {!result.found ? (
            <div className="p-6 bg-white border border-[#E5E5E5] rounded text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-black mx-auto" />
              <div className="text-sm font-bold text-[#111111]">
                {result.message || 'No record found'}
              </div>
              <p className="text-xs text-[#666666]">
                Make sure the identifier exists and was registered in this system.
              </p>
            </div>
          ) : (
            <>
              {/* 1. SERIAL RESULT (Section 37: show product + batch + kit + history) */}
              {result.type === 'serial' && result.item && (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-[#E5E5E5] rounded flex flex-col md:flex-row gap-4 items-center md:items-start">
                    {result.qrDataUrl && (
                      <div className="flex-shrink-0">
                        <QRCodeCard
                          code={result.item.serialCode}
                          type="serial"
                          dataUrl={result.qrDataUrl}
                          productName={result.item.productName}
                          partCode={result.item.partCode}
                        />
                      </div>
                    )}

                    <div className="flex-1 w-full space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                        <div>
                          <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                            Product Serial
                          </span>
                          <h2 className="text-lg font-black font-mono text-[#111111]">
                            {result.item.serialCode}
                          </h2>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                            result.item.status === 'in_kit'
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-100 text-black border border-[#E5E5E5]'
                          }`}
                        >
                          {result.item.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[#888888] block">Product Name:</span>
                          <span className="font-bold text-sm text-[#111111]">
                            {result.item.productName}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#888888] block">Part Code:</span>
                          <span className="font-mono text-[#111111]">{result.item.partCode}</span>
                        </div>
                        <div>
                          <span className="text-[#888888] block">Origin Batch:</span>
                          <Link
                            href={`/batches/${result.item.batchCode}`}
                            className="font-mono font-bold text-black underline"
                          >
                            {result.item.batchCode}
                          </Link>
                        </div>
                        <div>
                          <span className="text-[#888888] block">Assigned Kit:</span>
                          {result.item.kitCode ? (
                            <Link
                              href={`/kits/${result.item.kitCode}`}
                              className="font-mono font-bold text-black underline"
                            >
                              {result.item.kitCode}
                            </Link>
                          ) : (
                            <span className="text-[#888888]">Not assigned to any kit</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[#888888] block">Registered On:</span>
                          <span className="text-[#111111]">
                            {new Date(result.item.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit History Timeline (Section 37) */}
                  <div className="p-4 bg-white border border-[#E5E5E5] rounded space-y-3">
                    <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Serial Audit History
                    </h3>

                    {result.history && result.history.length > 0 ? (
                      <div className="divide-y divide-[#E5E5E5]">
                        {result.history.map((log, idx) => (
                          <div key={idx} className="py-2 text-xs flex justify-between items-center">
                            <div>
                              <span className="font-bold text-[#111111]">{log.action}</span>
                              {log.metadata && typeof log.metadata === 'object' && (
                                <span className="text-[#666666] ml-2">
                                  {JSON.stringify(log.metadata)}
                                </span>
                              )}
                            </div>
                            <span className="text-[#888888] font-mono text-[11px]">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#888888]">No audit records recorded.</p>
                    )}
                  </div>
                </div>
              )}

              {/* 2. BATCH RESULT (Section 37: show all products) */}
              {result.type === 'batch' && result.batch && (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-[#E5E5E5] rounded flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div>
                      <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                        Batch Record
                      </span>
                      <h2 className="text-xl font-black font-mono text-[#111111]">
                        {result.batch.code}
                      </h2>
                      <p className="text-xs text-[#666666] mt-0.5">
                        Status: <span className="font-bold uppercase">{result.batch.status}</span> • {result.products?.length || 0} Products
                      </p>
                    </div>

                    <Link
                      href={`/batches/${result.batch.code}`}
                      className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
                    >
                      Open Batch Page →
                    </Link>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
                    <div className="p-3 bg-neutral-50 border-b border-[#E5E5E5] text-xs font-bold text-[#111111]">
                      Batch Products ({result.products?.length || 0})
                    </div>
                    <div className="divide-y divide-[#E5E5E5] max-h-72 overflow-y-auto">
                      {result.products?.map((p) => (
                        <div key={p.serialCode} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-black">{p.serialCode}</span>
                            <span className="text-[#666666] ml-2">{p.productName}</span>
                          </div>
                          <span className="font-mono text-[#888888]">{p.kitCode || 'Unassigned'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. KIT RESULT (Section 37: show all products) */}
              {result.type === 'kit' && result.kit && (
                <div className="space-y-4">
                  <div className="p-4 bg-white border border-[#E5E5E5] rounded flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div>
                      <span className="text-[10px] text-[#888888] uppercase font-bold tracking-wider">
                        Kit Record
                      </span>
                      <h2 className="text-xl font-black font-mono text-[#111111]">
                        {result.kit.code}
                      </h2>
                      <p className="text-xs text-[#666666] mt-0.5">
                        Status: <span className="font-bold uppercase">{result.kit.status}</span> • {result.products?.length || 0} Assembled Items
                      </p>
                    </div>

                    <Link
                      href={`/kits/${result.kit.code}`}
                      className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
                    >
                      Open Kit Page →
                    </Link>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
                    <div className="p-3 bg-neutral-50 border-b border-[#E5E5E5] text-xs font-bold text-[#111111]">
                      Kit Items ({result.products?.length || 0})
                    </div>
                    <div className="divide-y divide-[#E5E5E5] max-h-72 overflow-y-auto">
                      {result.products?.map((p) => (
                        <div key={p.serialCode} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-black">{p.serialCode}</span>
                            <span className="text-[#666666] ml-2">{p.productName}</span>
                          </div>
                          <span className="font-mono text-[#888888]">Batch: {p.batchCode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#888888]">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
