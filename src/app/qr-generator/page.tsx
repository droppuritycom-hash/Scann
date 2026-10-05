'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  QrCode,
  Scan,
  Search,
  History,
  RefreshCw,
  Printer,
  Download,
  ArrowRight,
  Minus,
  Plus,
  Layers,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { EntityType, Product } from '@/types';
import { formatCode } from '@/lib/sequence';

interface StickerFormatConfig {
  type: EntityType;
  title: string;
  size: string;
  stickersPerPage: number;
  description: string;
}

const FORMAT_CONFIGS: Record<EntityType, StickerFormatConfig> = {
  serial: {
    type: 'serial',
    title: 'Serial Number',
    size: '50mm × 50mm',
    stickersPerPage: 2,
    description: '2 QRs per 50mm × 100mm thermal page',
  },
  batch: {
    type: 'batch',
    title: 'Batch Number',
    size: '50mm × 50mm',
    stickersPerPage: 2,
    description: '2 QRs per 50mm × 100mm thermal page',
  },
  kit: {
    type: 'kit',
    title: 'Kit Number',
    size: '50mm × 50mm',
    stickersPerPage: 2,
    description: '2 QRs per 50mm × 100mm thermal page',
  },
};

export default function QRGeneratorPage() {
  const router = useRouter();

  // Selected Sticker Format (Serial, Batch, Kit)
  const [selectedFormat, setSelectedFormat] = useState<EntityType>('serial');

  // Thermal Label Page Quantity (each page contains 2 QRs)
  const [numPages, setNumPages] = useState<number>(5);

  // Label Roll Orientation
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Live Sequence Range from DB
  const [nextIndex, setNextIndex] = useState<number>(0);
  const [firstCode, setFirstCode] = useState<string>('A00001');
  const [lastCode, setLastCode] = useState<string>('A00010');
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [loadingSequence, setLoadingSequence] = useState<boolean>(true);

  // Independent Sequence Counters (Serial, Batch, Kit)
  const [counters, setCounters] = useState<{
    serial: { index: number; nextCode: string };
    batch: { index: number; nextCode: string };
    kit: { index: number; nextCode: string };
  }>({
    serial: { index: 0, nextCode: 'A00001' },
    batch: { index: 0, nextCode: 'BAT-A00001' },
    kit: { index: 0, nextCode: 'KIT-A00001' },
  });
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetTarget, setResetTarget] = useState<EntityType | 'all'>('serial');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Sample Preview QR Codes (6 preview codes = 3 thermal pages of 2 QRs)
  const [previewQRs, setPreviewQRs] = useState<Array<{ code: string; dataUrl: string }>>([]);

  // Generation & Print Status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  const currentConfig = FORMAT_CONFIGS[selectedFormat];
  const totalStickers = numPages * currentConfig.stickersPerPage;

  // 1. Fetch live upcoming sequence from database
  const fetchLiveSequence = useCallback(async () => {
    setLoadingSequence(true);
    try {
      const res = await fetch(
        `/api/qr/next-sequence?type=${selectedFormat}&count=${totalStickers}`
      );
      const data = await res.json();
      if (data.success) {
        setNextIndex(data.nextIndex);
        setFirstCode(data.firstCode);
        setLastCode(data.lastCode);
        setHistoryCount(data.historyCount || 0);

        if (data.counters) {
          setCounters(data.counters);
        }

        // Generate preview sample codes dynamically using client QRCode
        generatePreviewSamples(data.nextIndex, selectedFormat);
      }
    } catch (err) {
      console.error('Failed to fetch sequence:', err);
    } finally {
      setLoadingSequence(false);
    }
  }, [selectedFormat, totalStickers]);

  // Handle in-app counter reset
  const handleResetCounter = async (target: EntityType | 'all') => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/qr/reset-counter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: target }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.counters) {
          setCounters(data.counters);
        }
        setSuccessBanner(data.message || 'Counter reset successfully!');
        setShowResetModal(false);
        fetchLiveSequence();
      } else {
        setErrorMessage(data.error || 'Failed to reset counter');
      }
    } catch (err) {
      console.error('Error resetting counter:', err);
      setErrorMessage('Network error while resetting counter');
    } finally {
      setIsResetting(false);
    }
  };

  // Generate 6 sample QR codes for preview (3 thermal labels)
  const generatePreviewSamples = async (startIndex: number, type: EntityType) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const samples: Array<{ code: string; dataUrl: string }> = [];

      for (let i = 0; i < 6; i++) {
        const code = formatCode(startIndex + i, type);
        const dataUrl = await QRCode.toDataURL(code, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 180,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        samples.push({ code, dataUrl });
      }
      setPreviewQRs(samples);
    } catch (err) {
      console.error('Failed to generate preview QRs:', err);
    }
  };

  useEffect(() => {
    fetchLiveSequence();
  }, [fetchLiveSequence]);

  // Fetch audit history when history modal is opened
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/activity?action=QR_GENERATED&limit=20');
      const data = await res.json();
      setHistoryLogs(data.logs || []);
      setShowHistoryModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Main Generation & Print Handler
  const handleGenerateAndPrint = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessBanner(null);

    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedFormat,
          quantity: totalStickers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to generate QR codes');
        return;
      }

      setSuccessBanner(
        `Generated ${data.count} sequential ${selectedFormat.toUpperCase()} QR codes (${firstCode} → ${lastCode}) across ${numPages} thermal pages (50mm × 100mm)!`
      );

      // Open print window for 50mm x 100mm thermal printer label pages
      openPrintSheetWindow(data.items, currentConfig, numPages, orientation);

      // Refresh live sequence counter from DB
      fetchLiveSequence();
    } catch {
      setErrorMessage('Network error while generating QR codes.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Printable 50mm x 100mm Thermal Printer Label Template (2 QRs per Label)
  const openPrintSheetWindow = (
    items: Array<{ code: string; dataUrl: string; productName?: string }>,
    config: StickerFormatConfig,
    pagesCount: number,
    printOrientation: 'portrait' | 'landscape' = 'portrait'
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Group items into pairs of 2 (bunch of two QRs per thermal page)
    const pagePairs: Array<Array<{ code: string; dataUrl: string; productName?: string }>> = [];
    for (let i = 0; i < items.length; i += 2) {
      pagePairs.push(items.slice(i, i + 2));
    }

    const isPortrait = printOrientation === 'portrait';

    const pagesHtml = pagePairs
      .map((pair, pIdx) => {
        const qr1 = pair[0];
        const qr2 = pair[1];

        return `
          <div class="thermal-page">
            <div class="qr-sticker">
              <img src="${qr1.dataUrl}" class="qr-img" alt="${qr1.code}" />
              <div class="qr-code">${qr1.code}</div>
              <div class="qr-sub">${config.title.toUpperCase()}</div>
              ${qr1.productName ? `<div class="qr-prod">${qr1.productName}</div>` : ''}
            </div>
            ${qr2 ? `
            <div class="qr-divider"></div>
            <div class="qr-sticker">
              <img src="${qr2.dataUrl}" class="qr-img" alt="${qr2.code}" />
              <div class="qr-code">${qr2.code}</div>
              <div class="qr-sub">${config.title.toUpperCase()}</div>
              ${qr2.productName ? `<div class="qr-prod">${qr2.productName}</div>` : ''}
            </div>
            ` : ''}
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Thermal Print - ${config.title} (${items.length} QRs · ${pagePairs.length} Labels · ${isPortrait ? '50mm × 100mm' : '100mm × 50mm'})</title>
          <style>
            @page {
              size: ${isPortrait ? '50mm 100mm' : '100mm 50mm'};
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .thermal-page {
              width: ${isPortrait ? '50mm' : '100mm'};
              height: ${isPortrait ? '100mm' : '50mm'};
              max-width: ${isPortrait ? '50mm' : '100mm'};
              max-height: ${isPortrait ? '100mm' : '50mm'};
              page-break-after: always;
              break-after: page;
              display: flex;
              flex-direction: ${isPortrait ? 'column' : 'row'};
              overflow: hidden;
              background: #fff;
              position: relative;
            }
            .qr-sticker {
              width: 50mm;
              height: 50mm;
              max-height: 50mm;
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 2mm 1.5mm;
              text-align: center;
              position: relative;
            }
            .qr-divider {
              ${isPortrait ? 'width: 100%; height: 0; border-top: 1px dashed #666;' : 'height: 100%; width: 0; border-left: 1px dashed #666;'}
            }
            .qr-img {
              width: 32mm;
              height: 32mm;
              display: block;
              margin: 0 auto;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: pixelated;
            }
            .qr-code {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 11pt;
              font-weight: 900;
              letter-spacing: 0.5px;
              line-height: 1.1;
              margin-top: 1.5mm;
              color: #000;
            }
            .qr-sub {
              font-size: 6.5pt;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #333;
              margin-top: 0.5mm;
            }
            .qr-prod {
              font-size: 5.5pt;
              color: #555;
              max-width: 44mm;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              margin-top: 0.5mm;
            }
            @media screen {
              body {
                background: #e5e5e5;
                padding: 24px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
              }
              .toolbar {
                background: #111111;
                color: #ffffff;
                padding: 10px 18px;
                border-radius: 10px;
                display: flex;
                gap: 14px;
                align-items: center;
                font-size: 12px;
                position: sticky;
                top: 16px;
                z-index: 100;
                box-shadow: 0 4px 16px rgba(0,0,0,0.25);
              }
              .toolbar button {
                background: #ffffff;
                color: #111111;
                border: none;
                padding: 6px 14px;
                font-weight: bold;
                border-radius: 6px;
                cursor: pointer;
                transition: opacity 0.15s;
              }
              .toolbar button:hover {
                opacity: 0.9;
              }
              .thermal-page {
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border: 1px solid #ccc;
              }
            }
            @media print {
              .toolbar {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="toolbar no-print">
            <span style="font-weight: bold;">
              Thermal Print: ${isPortrait ? '50mm × 100mm' : '100mm × 50mm'} (2 QRs/Label) · ${items.length} Stickers (${pagePairs.length} Labels)
            </span>
            <button onclick="window.print()">🖨️ Print Now</button>
          </div>
          ${pagesHtml}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Group preview items into pairs of 2 for simulated thermal label cards
  const previewPairs: Array<Array<{ code: string; dataUrl: string }>> = [];
  for (let i = 0; i < previewQRs.length; i += 2) {
    if (previewQRs[i]) {
      previewPairs.push([previewQRs[i], previewQRs[i + 1] || previewQRs[i]]);
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* =================================================================== */}
      {/* 1. TOP HEADER & NAVIGATION TABS                                     */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            Thermal QR Code Generator
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            50mm × 100mm thermal printer pages (bunch of 2 QRs per label)
          </p>
        </div>

        {/* Top-Right Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Generate & Print Button */}
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-lg shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Generate & Print</span>
          </button>

          {/* Scan Products Link */}
          <Link
            href="/scan"
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#111111] text-xs font-semibold rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 transition"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Scan Products</span>
          </Link>

          {/* Track Unit Link */}
          <Link
            href="/search"
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#111111] text-xs font-semibold rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Unit</span>
          </Link>

          {/* History Pill */}
          <button
            type="button"
            onClick={fetchHistory}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#111111] text-xs font-semibold rounded-lg border border-[#E5E5E5] hover:bg-neutral-50 transition"
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({historyCount})</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successBanner && (
        <div className="p-3 bg-neutral-900 text-white rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-white border border-black rounded-lg flex items-center gap-2 text-xs text-black font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. TWO-COLUMN MAIN BODY LAYOUT                                      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT COLUMN: Thermal Configuration Card (lg:col-span-5)           */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-5 bg-white border border-[#E5E5E5] rounded-2xl p-6 space-y-5">
          {/* Card Header with Step 1 Circle and Refresh */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h2 className="text-sm font-black text-[#111111]">Thermal Label Setup</h2>
                <p className="text-xs text-[#666666] mt-0.5">
                  50mm × 100mm page • 2 QRs per label
                </p>
              </div>
            </div>

            <button
              onClick={fetchLiveSequence}
              title="Refresh Next Sequence"
              className="p-1.5 text-[#666666] hover:text-black border border-[#E5E5E5] rounded-md hover:bg-neutral-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSequence ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Section: Sticker Format */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#111111]">
              Sticker Identifier Type
            </label>

            <div className="grid grid-cols-3 gap-2">
              {/* Option 1: Serial Number */}
              <button
                type="button"
                onClick={() => setSelectedFormat('serial')}
                className={`p-3 rounded-xl text-left transition flex flex-col justify-between border ${
                  selectedFormat === 'serial'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-black'
                }`}
              >
                <span className="font-black text-xs">Serial Number</span>
                <span className={`text-[10px] mt-1 font-mono font-bold ${
                  selectedFormat === 'serial' ? 'text-neutral-300' : 'text-[#666666]'
                }`}>
                  50mm × 50mm
                </span>
                <span className={`text-[10px] mt-0.5 ${
                  selectedFormat === 'serial' ? 'text-neutral-400' : 'text-[#888888]'
                }`}>
                  2 QRs / label
                </span>
              </button>

              {/* Option 2: Batch Number */}
              <button
                type="button"
                onClick={() => setSelectedFormat('batch')}
                className={`p-3 rounded-xl text-left transition flex flex-col justify-between border ${
                  selectedFormat === 'batch'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-black'
                }`}
              >
                <span className="font-black text-xs">Batch Number</span>
                <span className={`text-[10px] mt-1 font-mono font-bold ${
                  selectedFormat === 'batch' ? 'text-neutral-300' : 'text-[#666666]'
                }`}>
                  50mm × 50mm
                </span>
                <span className={`text-[10px] mt-0.5 ${
                  selectedFormat === 'batch' ? 'text-neutral-400' : 'text-[#888888]'
                }`}>
                  2 QRs / label
                </span>
              </button>

              {/* Option 3: Kit Number */}
              <button
                type="button"
                onClick={() => setSelectedFormat('kit')}
                className={`p-3 rounded-xl text-left transition flex flex-col justify-between border ${
                  selectedFormat === 'kit'
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-white text-[#111111] border-[#E5E5E5] hover:border-black'
                }`}
              >
                <span className="font-black text-xs">Kit Number</span>
                <span className={`text-[10px] mt-1 font-mono font-bold ${
                  selectedFormat === 'kit' ? 'text-neutral-300' : 'text-[#666666]'
                }`}>
                  50mm × 50mm
                </span>
                <span className={`text-[10px] mt-0.5 ${
                  selectedFormat === 'kit' ? 'text-neutral-400' : 'text-[#888888]'
                }`}>
                  2 QRs / label
                </span>
              </button>
            </div>
          </div>

          {/* Section: Thermal Roll Feed Orientation */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-[#111111]">
              Thermal Roll Feed Orientation
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  orientation === 'portrait'
                    ? 'bg-black text-white border-black font-bold'
                    : 'bg-white text-[#111111] border-[#E5E5E5] hover:bg-neutral-50'
                }`}
              >
                <div className="font-bold">Portrait (50mm × 100mm)</div>
                <div className={`text-[10px] mt-0.5 ${orientation === 'portrait' ? 'text-neutral-300' : 'text-[#666666]'}`}>
                  Standard: 2 QRs stacked vertically
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  orientation === 'landscape'
                    ? 'bg-black text-white border-black font-bold'
                    : 'bg-white text-[#111111] border-[#E5E5E5] hover:bg-neutral-50'
                }`}
              >
                <div className="font-bold">Landscape (100mm × 50mm)</div>
                <div className={`text-[10px] mt-0.5 ${orientation === 'landscape' ? 'text-neutral-300' : 'text-[#666666]'}`}>
                  2-Across: 2 QRs side-by-side
                </div>
              </button>
            </div>
          </div>

          {/* Section: Number of Thermal Labels (50mm × 100mm) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Number of Thermal Labels (50mm × 100mm)
              </span>
              <span className="text-[11px] font-bold text-[#111111] bg-neutral-100 px-2.5 py-0.5 rounded-full border border-[#E5E5E5]">
                Total: {totalStickers} QR Stickers ({numPages} Labels)
              </span>
            </div>

            {/* Stepper Control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNumPages((s) => Math.max(1, s - 1))}
                className="w-10 h-10 rounded-lg border border-[#E5E5E5] flex items-center justify-center hover:bg-neutral-50 text-[#111111] transition font-bold"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min="1"
                max="250"
                value={numPages}
                onChange={(e) => setNumPages(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 h-10 text-center font-bold text-sm border border-[#E5E5E5] rounded-lg focus:outline-none focus:border-black font-mono"
              />

              <button
                type="button"
                onClick={() => setNumPages((s) => Math.min(250, s + 1))}
                className="w-10 h-10 rounded-lg border border-[#E5E5E5] flex items-center justify-center hover:bg-neutral-50 text-[#111111] transition font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Preset Pages Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 5, 10, 25].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNumPages(preset)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition ${
                    numPages === preset
                      ? 'bg-black text-white border-black font-bold'
                      : 'bg-white text-[#111111] border-[#E5E5E5] hover:bg-neutral-50'
                  }`}
                >
                  {preset} {preset === 1 ? 'Label (2 QRs)' : `Labels (${preset * 2} QRs)`}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Auto-Starting Code */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] text-xs">
            <span className="text-[#666666]">Auto-Starting Code:</span>
            <span className="font-mono font-black text-sm text-[#111111] bg-neutral-50 px-3 py-1 rounded border border-[#E5E5E5]">
              {firstCode}
            </span>
          </div>

          {/* Action Button: Generate & Print */}
          <button
            type="button"
            disabled={isGenerating || loadingSequence}
            onClick={handleGenerateAndPrint}
            className="w-full py-3.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>
              {isGenerating
                ? 'Allocating in Database...'
                : `Generate & Print Thermal Labels (${numPages} Label${numPages > 1 ? 's' : ''} · ${totalStickers} QRs)`}
            </span>
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Sequence Range & Thermal Label Preview (lg:col-span-7) */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Sequence Range Card */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#111111]">Sequence Range</h2>
              <button
                type="button"
                onClick={() => {
                  setResetTarget(selectedFormat);
                  setShowResetModal(true);
                }}
                className="px-2.5 py-1 text-xs font-bold text-neutral-700 hover:text-black border border-[#E5E5E5] hover:border-black rounded-lg transition flex items-center gap-1.5 bg-white"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                <span>Reset Counter</span>
              </button>
            </div>

            <div className="bg-neutral-50/70 border border-[#E5E5E5] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#888888] tracking-wider uppercase block">
                    FIRST {selectedFormat.toUpperCase()}
                  </span>
                  <span className="text-2xl font-black font-mono text-[#111111] tracking-tight">
                    {firstCode}
                  </span>
                </div>

                <div className="text-[#888888] text-lg font-mono">→</div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#888888] tracking-wider uppercase block">
                    LAST {selectedFormat.toUpperCase()}
                  </span>
                  <span className="text-2xl font-black font-mono text-[#111111] tracking-tight">
                    {lastCode}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E5] text-xs">
                <span className="text-[#666666]">Thermal Page Size:</span>
                <span className="font-semibold text-[#111111]">
                  50mm × 100mm ({numPages} Label{numPages > 1 ? 's' : ''} · {totalStickers} QR Stickers)
                </span>
              </div>
            </div>

            {/* Independent Counter Status Bar */}
            <div className="pt-2 border-t border-[#E5E5E5] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#888888] uppercase tracking-wider">
                  Independent Live Counters
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Separate & Isolated
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('serial')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedFormat === 'serial'
                      ? 'border-black bg-neutral-900 text-white shadow-sm'
                      : 'border-[#E5E5E5] bg-neutral-50/70 hover:border-neutral-400 text-neutral-800'
                  }`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedFormat === 'serial' ? 'text-neutral-400' : 'text-[#888888]'}`}>
                    Serial
                  </div>
                  <div className="font-mono font-bold text-xs mt-0.5">
                    {counters.serial.nextCode}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${selectedFormat === 'serial' ? 'text-neutral-400' : 'text-[#888888]'}`}>
                    Generated: {counters.serial.index}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('batch')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedFormat === 'batch'
                      ? 'border-black bg-neutral-900 text-white shadow-sm'
                      : 'border-[#E5E5E5] bg-neutral-50/70 hover:border-neutral-400 text-neutral-800'
                  }`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedFormat === 'batch' ? 'text-neutral-400' : 'text-[#888888]'}`}>
                    Batch
                  </div>
                  <div className="font-mono font-bold text-xs mt-0.5">
                    {counters.batch.nextCode}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${selectedFormat === 'batch' ? 'text-neutral-400' : 'text-[#888888]'}`}>
                    Generated: {counters.batch.index}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('kit')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedFormat === 'kit'
                      ? 'border-black bg-neutral-900 text-white shadow-sm'
                      : 'border-[#E5E5E5] bg-neutral-50/70 hover:border-neutral-400 text-neutral-800'
                  }`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedFormat === 'kit' ? 'text-neutral-400' : 'text-[#888888]'}`}>
                    Kit
                  </div>
                  <div className="font-mono font-bold text-xs mt-0.5">
                    {counters.kit.nextCode}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${selectedFormat === 'kit' ? 'text-neutral-400' : 'text-[#888888]'}`}>
                    Generated: {counters.kit.index}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Thermal Label Preview Card */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-black text-[#111111]">Thermal Label Preview</h2>
                <p className="text-xs text-[#666666] mt-0.5">
                  50mm × 100mm roll (bunch of 2 QRs per label with center perforation)
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-neutral-100 text-[#444] px-2 py-0.5 rounded border border-[#E5E5E5]">
                2 QRs / 50×100mm Page
              </span>
            </div>

            {/* Simulated 50mm x 100mm Thermal Labels (each card holds 2 QRs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {previewPairs.map((pair, pIdx) => (
                <div
                  key={pIdx}
                  className="bg-white border-2 border-dashed border-[#CCCCCC] rounded-xl p-2.5 flex flex-col items-center justify-between text-center shadow-sm relative hover:border-black transition"
                >
                  <div className="w-full text-center text-[9px] font-mono text-[#888888] pb-1 border-b border-[#F0F0F0]">
                    Label #{pIdx + 1} (50mm × 100mm)
                  </div>

                  {/* QR 1 (Top Half - 50mm x 50mm) */}
                  <div className="w-full py-2 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 flex items-center justify-center mb-1">
                      {pair[0]?.dataUrl ? (
                        <img
                          src={pair[0].dataUrl}
                          alt={pair[0].code}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">
                          QR 1
                        </div>
                      )}
                    </div>
                    <div className="font-mono font-black text-xs text-[#111111]">
                      {pair[0]?.code}
                    </div>
                    <div className="text-[9px] text-[#777777] font-semibold uppercase">
                      50×50mm {selectedFormat}
                    </div>
                  </div>

                  {/* Perforation Guideline / Tear Line */}
                  <div className="w-full border-t-2 border-dashed border-neutral-300 my-1 relative flex items-center justify-center">
                    <span className="bg-white px-2 text-[8px] text-[#999999] uppercase font-bold tracking-wider -mt-2">
                      ✂ 50mm Cut Line
                    </span>
                  </div>

                  {/* QR 2 (Bottom Half - 50mm x 50mm) */}
                  <div className="w-full py-2 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 flex items-center justify-center mb-1">
                      {pair[1]?.dataUrl ? (
                        <img
                          src={pair[1].dataUrl}
                          alt={pair[1].code}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">
                          QR 2
                        </div>
                      )}
                    </div>
                    <div className="font-mono font-black text-xs text-[#111111]">
                      {pair[1]?.code}
                    </div>
                    <div className="text-[9px] text-[#777777] font-semibold uppercase">
                      50×50mm {selectedFormat}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Callout Banner */}
            <div className="pt-2">
              <div className="bg-neutral-50 border border-[#E5E5E5] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-[#111111]">Ready to scan?</div>
                  <div className="text-xs text-[#666666] mt-0.5">
                    Scan manufactured stickers into inventory.
                  </div>
                </div>

                <Link
                  href="/scan"
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition flex items-center gap-1.5"
                >
                  <span>Open Scanner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. HISTORY MODAL                                                    */}
      {/* =================================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-none animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-black" />
                <h2 className="text-sm font-black text-[#111111]">
                  Generation History
                </h2>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-[#666666] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E5E5] text-xs">
              {historyLogs.length > 0 ? (
                historyLogs.map((log, idx) => (
                  <div key={log._id || idx} className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-mono font-bold text-black">{log.code}</div>
                      <div className="text-[#666666] text-[11px]">
                        Type: {log.entityType} • Count: {log.metadata?.count || 1}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-[#888888] font-mono">
                      {new Date(log.timestamp).toLocaleDateString()}{' '}
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-[#888888]">
                  No generation history logs yet.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#E5E5E5]">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. COUNTER RESET CONFIRMATION MODAL                                 */}
      {/* =================================================================== */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-black" />
                <h2 className="text-base font-black text-[#111111]">
                  Reset Sequence Counter
                </h2>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-[#666666] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              Each sticker identifier maintains its own independent sequence counter. Resetting a counter rewinds its next starting code back to #1 (e.g. <span className="font-mono font-bold text-black">A00001</span>, <span className="font-mono font-bold text-black">BAT-A00001</span>, or <span className="font-mono font-bold text-black">KIT-A00001</span>).
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] block">
                Select Counter to Reset:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget('serial')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition ${
                    resetTarget === 'serial'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-[#E5E5E5] hover:border-black'
                  }`}
                >
                  <div>Serial Number</div>
                  <div className={`text-[10px] font-mono font-normal mt-0.5 ${resetTarget === 'serial' ? 'text-neutral-300' : 'text-[#666666]'}`}>
                    Next: {counters.serial.nextCode}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setResetTarget('batch')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition ${
                    resetTarget === 'batch'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-[#E5E5E5] hover:border-black'
                  }`}
                >
                  <div>Batch Number</div>
                  <div className={`text-[10px] font-mono font-normal mt-0.5 ${resetTarget === 'batch' ? 'text-neutral-300' : 'text-[#666666]'}`}>
                    Next: {counters.batch.nextCode}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setResetTarget('kit')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition ${
                    resetTarget === 'kit'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-[#E5E5E5] hover:border-black'
                  }`}
                >
                  <div>Kit Number</div>
                  <div className={`text-[10px] font-mono font-normal mt-0.5 ${resetTarget === 'kit' ? 'text-neutral-300' : 'text-[#666666]'}`}>
                    Next: {counters.kit.nextCode}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setResetTarget('all')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition ${
                    resetTarget === 'all'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-[#E5E5E5] hover:border-black'
                  }`}
                >
                  <div>All 3 Counters</div>
                  <div className={`text-[10px] font-normal mt-0.5 ${resetTarget === 'all' ? 'text-neutral-300' : 'text-[#666666]'}`}>
                    Reset All to #1
                  </div>
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Resetting will restart numbering from <strong>{resetTarget === 'all' ? '00001 for all types' : resetTarget === 'serial' ? 'A00001' : resetTarget === 'batch' ? 'BAT-A00001' : 'KIT-A00001'}</strong>. Existing scanned inventory and products are preserved.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E5E5]">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 border border-[#E5E5E5] hover:border-black rounded-lg text-xs font-bold text-black transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={() => handleResetCounter(resetTarget)}
                className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                {isResetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
