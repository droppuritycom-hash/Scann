'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Layers,
  Package,
  Scan,
  TrendingUp,
  History,
  QrCode,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { AuditLog } from '@/types';

interface StatsResponse {
  totalProducts: number;
  totalBatches: number;
  totalKits: number;
  totalInventoryItems: number;
  todayScans: number;
  unassignedProducts: number;
  productsInKits: number;
  recentActivity: AuditLog[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load stats:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome & Primary Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-xl font-black text-[#111111] tracking-tight">
            Warehouse Inventory & QR Operations
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Physical RO purifier component serialization, batching, and kit assembly
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/scan"
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
          >
            <Scan className="w-4 h-4" />
            <span>Launch Scanner</span>
          </Link>
          <Link
            href="/qr-generator"
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded hover:bg-neutral-100 transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Generate QR</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid - Minimal Black & White Cards (Section 32 & 42) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Master Products */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
            Total Products
          </div>
          <div className="text-2xl font-black text-[#111111] mt-1 font-mono">
            {loading ? '...' : stats?.totalProducts?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] text-[#888888] mt-1">Master catalog items</div>
        </div>

        {/* Total Batches */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
            Total Batches
          </div>
          <div className="text-2xl font-black text-[#111111] mt-1 font-mono">
            {loading ? '...' : stats?.totalBatches?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] text-[#888888] mt-1">BAT-* series</div>
        </div>

        {/* Total Kits */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
            Total Kits
          </div>
          <div className="text-2xl font-black text-[#111111] mt-1 font-mono">
            {loading ? '...' : stats?.totalKits?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] text-[#888888] mt-1">KIT-* containers</div>
        </div>

        {/* Today's Scans */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
            Today&apos;s Scans
          </div>
          <div className="text-2xl font-black text-[#111111] mt-1 font-mono">
            {loading ? '...' : stats?.todayScans?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] text-[#888888] mt-1">Recorded operations</div>
        </div>

        {/* Unassigned Products */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
            Unassigned
          </div>
          <div className="text-2xl font-black text-[#111111] mt-1 font-mono">
            {loading ? '...' : stats?.unassignedProducts?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] text-[#888888] mt-1">Available for kits</div>
        </div>

        {/* Products in Kits */}
        <div className="p-4 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider">
            In Kits
          </div>
          <div className="text-2xl font-black text-[#111111] mt-1 font-mono">
            {loading ? '...' : stats?.productsInKits?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] text-[#888888] mt-1">Assembled in buckets</div>
        </div>
      </div>

      {/* Main Operations Shortcut Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Batch Flow Banner */}
        <div className="p-5 border border-[#E5E5E5] rounded bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#111111] font-bold text-sm">
              <Layers className="w-4 h-4" />
              <span>Step 1: Batch Registration</span>
            </div>
            <p className="text-xs text-[#666666] mt-1 leading-relaxed">
              Scan a Batch QR (e.g. <span className="font-mono font-bold text-black">BAT-A00001</span>) and continuously pair newly arrived serialized components with physical items from the master catalog.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/scan"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:underline"
            >
              Start Batch Scanning <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Kit Flow Banner */}
        <div className="p-5 border border-[#E5E5E5] rounded bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#111111] font-bold text-sm">
              <Package className="w-4 h-4" />
              <span>Step 2: Kit / Bucket Assembly</span>
            </div>
            <p className="text-xs text-[#666666] mt-1 leading-relaxed">
              Scan a Kit QR (e.g. <span className="font-mono font-bold text-black">KIT-A00001</span>) and add previously batch-registered components. The system strictly prevents duplicate kit assignments.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/scan"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:underline"
            >
              Start Kit Scanning <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Audit Table (Section 32) */}
      <div className="border border-[#E5E5E5] rounded bg-white p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
          <h2 className="text-xs font-bold text-[#111111] flex items-center gap-1.5 uppercase tracking-wider">
            <History className="w-3.5 h-3.5" />
            Recent Activity Log
          </h2>
          <Link href="/activity" className="text-xs text-[#666666] hover:text-black font-semibold">
            View All Activity →
          </Link>
        </div>

        <div className="divide-y divide-[#E5E5E5]">
          {loading ? (
            <div className="py-6 text-center text-xs text-[#888888]">Loading activity log...</div>
          ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((log, idx) => (
              <div key={log._id?.toString() || idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  {log.action.includes('REJECTED') || log.action.includes('DUPLICATE') ? (
                    <AlertTriangle className="w-4 h-4 text-black flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-black flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-[#111111]">{log.action.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-semibold text-[#444444] ml-2">[{log.code}]</span>
                    {log.metadata && typeof log.metadata === 'object' && 'productName' in log.metadata ? (
                      <span className="text-[#666666] ml-2">
                        • {String(log.metadata.productName)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-[11px] text-[#888888] font-mono whitespace-nowrap ml-4">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-[#888888]">
              No activity logs recorded yet. Begin by scanning or generating QR codes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
