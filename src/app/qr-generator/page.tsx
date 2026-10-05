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
} from 'lucide-react';
import { EntityType, Product } from '@/types';
import { formatCode } from '@/lib/sequence';

interface StickerFormatConfig {
  type: EntityType;
  title: string;
  size: string;
  stickersPerSheet: number;
  description: string;
}

const FORMAT_CONFIGS: Record<EntityType, StickerFormatConfig> = {
  serial: {
    type: 'serial',
    title: 'Serial Number',
    size: '100 mm × 50 mm',
    stickersPerSheet: 24,
    description: '24 stickers / sheet (100×50mm)',
  },
  batch: {
    type: 'batch',
    title: 'Batch Number',
    size: '100 mm × 50 mm',
    stickersPerSheet: 24,
    description: '24 stickers / sheet (100×50mm)',
  },
  kit: {
    type: 'kit',
    title: 'Kit Number',
    size: '100 mm × 50 mm',
    stickersPerSheet: 24,
    description: '24 stickers / sheet (100×50mm)',
  },
};

export default function QRGeneratorPage() {
  const router = useRouter();

  // Selected Sticker Format (Serial, Batch, Kit)
  const [selectedFormat, setSelectedFormat] = useState<EntityType>('serial');

  // Sheet Quantity
  const [numSheets, setNumSheets] = useState<number>(1);

  // Live Sequence Range from DB
  const [nextIndex, setNextIndex] = useState<number>(0);
  const [firstCode, setFirstCode] = useState<string>('A00001');
  const [lastCode, setLastCode] = useState<string>('A00024');
  const [historyCount, setHistoryCount] = useState<number>(0);
  const [loadingSequence, setLoadingSequence] = useState<boolean>(true);

  // Sample Preview QR Codes (6 preview cards)
  const [previewQRs, setPreviewQRs] = useState<Array<{ code: string; dataUrl: string }>>([]);

  // Generation & Print Status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  const currentConfig = FORMAT_CONFIGS[selectedFormat];
  const totalStickers = numSheets * currentConfig.stickersPerSheet;

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

        // Generate 6 preview sample codes dynamically using client QRCode
        generatePreviewSamples(data.nextIndex, selectedFormat);
      }
    } catch (err) {
      console.error('Failed to fetch sequence:', err);
    } finally {
      setLoadingSequence(false);
    }
  }, [selectedFormat, totalStickers]);

  // Generate 6 sample QR codes for the preview grid
  const generatePreviewSamples = async (startIndex: number, type: EntityType) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const samples: Array<{ code: string; dataUrl: string }> = [];

      for (let i = 0; i < 6; i++) {
        const code = formatCode(startIndex + i, type);
        const dataUrl = await QRCode.toDataURL(code, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 140,
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
        `Generated ${data.count} sequential ${selectedFormat.toUpperCase()} QR codes (${firstCode} → ${lastCode})!`
      );

      // Open print window for 12" x 18" digital paper sheet
      openPrintSheetWindow(data.items, currentConfig, numSheets);

      // Refresh live sequence counter from DB
      fetchLiveSequence();
    } catch {
      setErrorMessage('Network error while generating QR codes.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Printable 12" x 18" Digital Paper Sheet Template
  const openPrintSheetWindow = (
    items: Array<{ code: string; dataUrl: string; productName?: string }>,
    config: StickerFormatConfig,
    sheets: number
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build sticker items
    const stickersHtml = items
      .map(
        (item) => `
        <div class="sticker-cell">
          <img src="${item.dataUrl}" class="qr-img" alt="${item.code}" />
          <div class="sticker-details">
            <div class="qr-code">${item.code}</div>
            <div class="qr-sub">${config.title.toUpperCase()}</div>
            ${item.productName ? `<div class="qr-product">${item.productName}</div>` : ''}
            <div class="qr-dim">100 mm × 50 mm</div>
          </div>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Sheet - ${config.title} (${items.length} QRs · 100mm × 50mm)</title>
          <style>
            @page {
              size: 12in 18in;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
            }
            .header-info {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: bold;
              border-bottom: 2px solid #000;
              padding: 6px 8px;
              margin-bottom: 6mm;
            }
            .sheet-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 4mm;
              justify-content: flex-start;
            }
            .sticker-cell {
              width: 100mm;
              height: 50mm;
              border: 1px dashed #999;
              border-radius: 4px;
              padding: 4mm 6mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: flex-start;
              gap: 5mm;
              page-break-inside: avoid;
              overflow: hidden;
              background: #fff;
            }
            .qr-img {
              width: 40mm;
              height: 40mm;
              object-fit: contain;
              flex-shrink: 0;
            }
            .sticker-details {
              display: flex;
              flex-direction: column;
              justify-content: center;
              text-align: left;
              flex-grow: 1;
              min-width: 0;
            }
            .qr-code {
              font-size: 20px;
              font-weight: 900;
              font-family: monospace;
              letter-spacing: 0.5px;
              color: #000;
              line-height: 1.1;
              word-break: break-all;
            }
            .qr-sub {
              font-size: 11px;
              font-weight: bold;
              color: #111;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 4px;
            }
            .qr-product {
              font-size: 10px;
              color: #444;
              margin-top: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 45mm;
            }
            .qr-dim {
              font-size: 9px;
              color: #666;
              font-weight: 600;
              margin-top: 3px;
            }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <span>FORMAT: ${config.title.toUpperCase()} (100 mm × 50 mm)</span>
            <span>RANGE: ${items[0]?.code || ''} → ${items[items.length - 1]?.code || ''}</span>
            <span>TOTAL: ${items.length} STICKERS (${sheets} SHEET${sheets > 1 ? 'S' : ''})</span>
            <span>12" × 18" DIGITAL PAPER</span>
          </div>
          <div class="sheet-grid">
            ${stickersHtml}
          </div>
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

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* =================================================================== */}
      {/* 1. TOP HEADER & NAVIGATION TABS                                     */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            QR Code Generator
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Print sheets and scan inventory
          </p>
        </div>

        {/* Top-Right Navigation Buttons (Matching Image) */}
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
      {/* 2. TWO-COLUMN MAIN BODY LAYOUT (Matching Reference Image)           */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT COLUMN: 1. Print Sheets Configuration Card (lg:col-span-5)   */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-5 bg-white border border-[#E5E5E5] rounded-2xl p-6 space-y-6">
          {/* Card Header with Step 1 Circle and Refresh */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h2 className="text-sm font-black text-[#111111]">Print Sheets</h2>
                <p className="text-xs text-[#666666] mt-0.5">
                  Select sticker format and quantity
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
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#111111]">
                Sticker Format
              </label>
              <span className="text-[11px] font-mono font-bold text-black bg-neutral-100 px-2 py-0.5 rounded border border-[#E5E5E5]">
                100 mm × 50 mm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-xs">Serial Number</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      selectedFormat === 'serial'
                        ? 'bg-white text-black'
                        : 'bg-neutral-100 text-[#555555]'
                    }`}
                  >
                    100 × 50 mm
                  </span>
                </div>
                <span
                  className={`text-[10px] mt-2 ${
                    selectedFormat === 'serial' ? 'text-neutral-300' : 'text-[#666666]'
                  }`}
                >
                  24 stickers / sheet
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
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-xs">Batch Number</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      selectedFormat === 'batch'
                        ? 'bg-white text-black'
                        : 'bg-neutral-100 text-[#555555]'
                    }`}
                  >
                    100 × 50 mm
                  </span>
                </div>
                <span
                  className={`text-[10px] mt-2 ${
                    selectedFormat === 'batch' ? 'text-neutral-300' : 'text-[#666666]'
                  }`}
                >
                  24 stickers / sheet
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
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-xs">Kit Number</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      selectedFormat === 'kit'
                        ? 'bg-white text-black'
                        : 'bg-neutral-100 text-[#555555]'
                    }`}
                  >
                    100 × 50 mm
                  </span>
                </div>
                <span
                  className={`text-[10px] mt-2 ${
                    selectedFormat === 'kit' ? 'text-neutral-300' : 'text-[#666666]'
                  }`}
                >
                  24 stickers / sheet
                </span>
              </button>
            </div>
          </div>

          {/* Section: Number of Sheets (12" × 18") */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Number of Sheets (12&quot; × 18&quot;)
              </span>
              <span className="text-[11px] font-bold text-[#111111] bg-neutral-100 px-2.5 py-0.5 rounded-full border border-[#E5E5E5]">
                Total: {totalStickers} Stickers
              </span>
            </div>

            {/* Stepper Control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNumSheets((s) => Math.max(1, s - 1))}
                className="w-10 h-10 rounded-lg border border-[#E5E5E5] flex items-center justify-center hover:bg-neutral-50 text-[#111111] transition font-bold"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min="1"
                max="50"
                value={numSheets}
                onChange={(e) => setNumSheets(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 h-10 text-center font-bold text-sm border border-[#E5E5E5] rounded-lg focus:outline-none focus:border-black font-mono"
              />

              <button
                type="button"
                onClick={() => setNumSheets((s) => Math.min(50, s + 1))}
                className="w-10 h-10 rounded-lg border border-[#E5E5E5] flex items-center justify-center hover:bg-neutral-50 text-[#111111] transition font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Preset Sheets Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 5, 10].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNumSheets(preset)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition ${
                    numSheets === preset
                      ? 'bg-black text-white border-black font-bold'
                      : 'bg-white text-[#111111] border-[#E5E5E5] hover:bg-neutral-50'
                  }`}
                >
                  {preset} {preset === 1 ? 'Sheet' : 'Sheets'}
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

          {/* Action Button: Generate & Download PDF */}
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
                : `Generate & Download PDF (${numSheets} Sheet${numSheets > 1 ? 's' : ''} · ${totalStickers} QRs)`}
            </span>
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT COLUMN: Sequence Range & Sticker Preview (lg:col-span-7)    */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Sequence Range Card */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-black text-[#111111]">Sequence Range</h2>

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
                <span className="text-[#666666]">Sheet Format:</span>
                <span className="font-semibold text-[#111111]">
                  12&quot; × 18&quot; Digital Paper ({numSheets} Sheet{numSheets > 1 ? 's' : ''})
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Sticker Preview Card */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[#111111]">Sticker Preview</h2>
                <span className="text-[10px] font-mono font-bold text-black bg-neutral-100 px-2 py-0.5 rounded border border-[#E5E5E5]">
                  100 mm × 50 mm
                </span>
              </div>
              <p className="text-xs text-[#666666] mt-0.5">
                Exact physical scale: 100 mm width × 50 mm height (12&quot; × 18&quot; digital paper)
              </p>
            </div>

            {/* 6 Preview Cards Grid - 100mm x 50mm Landscape Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {previewQRs.map((item) => (
                <div
                  key={item.code}
                  className="bg-white border border-[#E5E5E5] rounded-xl p-3 flex flex-row items-center gap-3.5 transition hover:border-black"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center bg-white p-1 border border-[#EEEEEE] rounded">
                    {item.dataUrl ? (
                      <img
                        src={item.dataUrl}
                        alt={item.code}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">
                        QR
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-mono font-black text-base text-[#111111] truncate">
                      {item.code}
                    </div>
                    <div className="text-[11px] font-bold text-[#333333] uppercase mt-0.5">
                      {selectedFormat === 'serial'
                        ? 'Serial Number'
                        : selectedFormat === 'batch'
                        ? 'Batch Number'
                        : 'Kit Number'}
                    </div>
                    <div className="inline-block mt-1 px-2 py-0.5 bg-neutral-100 border border-[#E5E5E5] rounded text-[10px] font-mono font-bold text-[#555555]">
                      100 mm × 50 mm
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Callout Banner: "Ready to scan?" */}
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
    </div>
  );
}
