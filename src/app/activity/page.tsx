'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AuditLog } from '@/types';

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
      });
      if (actionFilter) params.set('action', actionFilter);
      if (codeSearch) params.set('code', codeSearch);

      const res = await fetch(`/api/activity?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-xl font-black text-[#111111] flex items-center gap-2">
            <History className="w-5 h-5" />
            Audit & Operations Trail ({totalCount})
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Immutable log of all QR scans, batch additions, kit assemblies, and rejected duplicates
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 border border-[#E5E5E5] rounded hover:bg-neutral-100 text-[#111111] text-xs font-semibold flex items-center gap-1 self-start sm:self-auto transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E5E5E5] rounded p-3 flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={codeSearch}
              onChange={(e) => setCodeSearch(e.target.value)}
              placeholder="Search code (A00001, BAT-..., KIT-...)..."
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
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs px-3 py-2 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black"
        >
          <option value="">All Action Types</option>
          <option value="PRODUCT_ADDED_TO_BATCH">Product Added To Batch</option>
          <option value="PRODUCT_ADDED_TO_KIT">Product Added To Kit</option>
          <option value="DUPLICATE_SCAN">Duplicate Scan Blocked</option>
          <option value="KIT_ASSIGNMENT_REJECTED">Kit Assignment Rejected</option>
          <option value="QR_GENERATED">QR Generated</option>
          <option value="BATCH_CREATED">Batch Created</option>
          <option value="KIT_CLOSED">Kit Closed</option>
          <option value="BATCH_CLOSED">Batch Closed</option>
        </select>
      </div>

      {/* Activity Logs Table */}
      <div className="bg-white border border-[#E5E5E5] rounded overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-[#E5E5E5] text-[#666666] font-semibold">
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Operation / Action</th>
              <th className="py-2.5 px-3 font-mono">Identifier</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Metadata</th>
              <th className="py-2.5 px-3 font-mono">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#888888]">
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log, idx) => {
                const isWarning =
                  log.action.includes('DUPLICATE') ||
                  log.action.includes('REJECTED') ||
                  log.action.includes('INVALID');

                return (
                  <tr key={log._id?.toString() || idx} className="hover:bg-neutral-50 transition">
                    <td className="py-2.5 px-3">
                      {isWarning ? (
                        <span className="p-1 bg-neutral-100 text-black rounded inline-block" title="Security / Integrity Guard Blocked Action">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="p-1 bg-black text-white rounded inline-block" title="Successful Operation">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#111111]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#111111]">
                      {log.code}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-[#666666] font-semibold">
                      {log.entityType}
                    </td>
                    <td className="py-2.5 px-3 text-[#555555] font-mono text-[11px] max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-[#888888] font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#888888]">
                  No audit entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <div className="text-[#666666]">
            Page {page} of {totalPages} ({totalCount} total entries)
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
