'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Package,
  ArrowLeft,
  Scan,
  Download,
  Printer,
  Copy,
  Check,
  CheckCircle,
} from 'lucide-react';
import { Kit, InventoryItem } from '@/types';
import QRCodeCard from '@/components/qr/QRCodeCard';

export default function KitDetailPage() {
  const params = useParams();
  const rawCode = params?.code as string;
  const kitCode = decodeURIComponent(rawCode || '').trim().toUpperCase();

  const [kit, setKit] = useState<Kit | null>(null);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKitDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kits/${encodeURIComponent(kitCode)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load kit');
        return;
      }
      setKit(data.kit);
      setProducts(data.products || []);
      setQrDataUrl(data.qrDataUrl || '');
    } catch {
      setError('Network error while loading kit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (kitCode) {
      fetchKitDetails();
    }
  }, [kitCode]);

  const toggleKitStatus = async () => {
    if (!kit) return;
    const nextStatus = kit.status === 'open' ? 'closed' : 'open';
    try {
      const res = await fetch(`/api/kits/${encodeURIComponent(kitCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setKit(data.kit);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-[#888888]">Loading kit details...</div>;
  }

  if (error || !kit) {
    return (
      <div className="p-6 bg-white border border-black rounded text-center space-y-3">
        <div className="text-sm font-bold text-black">{error || 'Kit not found'}</div>
        <Link
          href="/kits"
          className="inline-block px-4 py-2 bg-black text-white text-xs font-semibold rounded"
        >
          ← Return to Kits
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2">
          <Link
            href="/kits"
            className="p-1 border border-[#E5E5E5] rounded hover:bg-neutral-100 text-[#111111] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black font-mono text-[#111111]">{kit.code}</h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  kit.status === 'open'
                    ? 'bg-neutral-100 text-black border border-[#E5E5E5]'
                    : 'bg-neutral-900 text-white'
                }`}
              >
                {kit.status}
              </span>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Created on {new Date(kit.createdAt).toLocaleString()} • {products.length} Products Assembled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleKitStatus}
            className="px-3 py-1.5 border border-[#E5E5E5] rounded text-xs font-semibold hover:bg-neutral-100 transition"
          >
            Mark {kit.status === 'open' ? 'Closed' : 'Open'}
          </button>
          <Link
            href="/scan"
            className="px-3 py-1.5 bg-black text-white rounded text-xs font-bold hover:bg-neutral-800 transition flex items-center gap-1.5"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Scan Products Into Kit</span>
          </Link>
        </div>
      </div>

      {/* Top Details & QR Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* QR Code Label */}
        <div className="md:col-span-1">
          <QRCodeCard
            code={kit.code}
            type="kit"
            dataUrl={qrDataUrl}
            productName="KIT CONTAINER"
          />
        </div>

        {/* Kit Summary Info */}
        <div className="md:col-span-2 bg-white border border-[#E5E5E5] rounded p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
            Kit Specification & Inventory Constraint
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#888888] block">Kit Code:</span>
              <span className="font-mono font-bold text-sm text-[#111111]">{kit.code}</span>
            </div>
            <div>
              <span className="text-[#888888] block">Products Count:</span>
              <span className="font-bold text-sm text-[#111111]">{products.length} units</span>
            </div>
            <div>
              <span className="text-[#888888] block">Kit Status:</span>
              <span className="font-bold text-sm text-[#111111] uppercase">{kit.status}</span>
            </div>
            <div>
              <span className="text-[#888888] block">Last Modified:</span>
              <span className="text-[#111111]">
                {kit.updatedAt ? new Date(kit.updatedAt).toLocaleString() : '—'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E5E5] text-xs text-[#666666]">
            Every serialized item assigned to this kit is locked against being added to another kit. Backend uniqueness constraints enforce single active kit membership per serial.
          </div>
        </div>
      </div>

      {/* Products in This Kit Table (Section 11) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#111111] flex items-center justify-between">
          <span>Kit Contents ({products.length})</span>
        </h2>

        <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-[#E5E5E5] text-[#666666] font-semibold">
                <th className="py-2.5 px-3 font-mono">Serial Code</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3 font-mono">Part Code</th>
                <th className="py-2.5 px-3 font-mono">Origin Batch</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Added Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {products.length > 0 ? (
                products.map((item) => (
                  <tr key={item.serialCode} className="hover:bg-neutral-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#111111]">
                      <Link href={`/search?q=${item.serialCode}`} className="hover:underline">
                        {item.serialCode}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#111111]">
                      {item.productName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#666666]">
                      {item.partCode}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <Link href={`/batches/${item.batchCode}`} className="text-black font-semibold hover:underline">
                        {item.batchCode}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-900 text-white">
                        In Kit
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#888888] font-mono text-[11px]">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#888888]">
                    No items in this kit yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
