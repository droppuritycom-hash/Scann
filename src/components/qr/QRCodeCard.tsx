'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Download, Printer, Copy, Check } from 'lucide-react';
import { EntityType } from '@/types';

interface QRCodeCardProps {
  code: string;
  type: EntityType;
  dataUrl: string;
  productName?: string | null;
  partCode?: string | null;
  showActions?: boolean;
}

export default function QRCodeCard({
  code,
  type,
  dataUrl,
  productName,
  partCode,
  showActions = true,
}: QRCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${code} (50mm × 50mm)</title>
          <style>
            @page {
              size: 50mm 50mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              width: 50mm;
              height: 50mm;
              max-width: 50mm;
              max-height: 50mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 2mm 1.5mm;
              background: #fff;
              color: #000;
              text-align: center;
            }
            .qr-img {
              width: 32mm;
              height: 32mm;
              display: block;
              margin: 0 auto;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: pixelated;
            }
            .qr-code-text {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 11pt;
              font-weight: 900;
              letter-spacing: 0.5px;
              line-height: 1.1;
              margin-top: 1.5mm;
              color: #000;
            }
            .qr-subtext {
              font-size: 6.5pt;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #333;
              margin-top: 0.5mm;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" class="qr-img" alt="${code}" />
          <div class="qr-code-text">${code}</div>
          <div class="qr-subtext">${productName || `${type.toUpperCase()} IDENTIFIER`}</div>
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
    <div className="bg-white border border-[#E5E5E5] rounded p-4 flex flex-col items-center text-center transition hover:border-[#CCCCCC]">
      {/* QR Code Canvas/Image */}
      <div className="p-2 bg-white border border-[#E5E5E5] rounded mb-3">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={code}
            className="w-44 h-44 object-contain"
            width={176}
            height={176}
          />
        ) : (
          <div className="w-44 h-44 flex items-center justify-center bg-neutral-100 text-xs text-[#888888]">
            Generating...
          </div>
        )}
      </div>

      {/* Human-Readable QR Label - EXACT ERP SPECIFICATION (Section 17) */}
      <div className="w-full">
        <div className="text-base font-black tracking-wider text-[#111111] font-mono select-all">
          {code}
        </div>
        {productName && (
          <div className="text-xs font-semibold text-[#555555] mt-0.5 truncate max-w-[200px] mx-auto">
            {productName}
          </div>
        )}
        {partCode && partCode !== productName && (
          <div className="text-[11px] text-[#777777] font-mono mt-0.5 truncate max-w-[200px] mx-auto">
            {partCode}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E5E5E5] w-full justify-center">
          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1.5 border border-[#E5E5E5] rounded hover:bg-neutral-100 text-[#111111] transition flex items-center justify-center text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            title="Download PNG"
            className="p-1.5 border border-[#E5E5E5] rounded hover:bg-neutral-100 text-[#111111] transition flex items-center justify-center text-xs"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePrint}
            title="Print Label"
            className="p-1.5 border border-[#E5E5E5] rounded hover:bg-neutral-100 text-[#111111] transition flex items-center justify-center text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
