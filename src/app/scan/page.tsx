'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Package,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Search,
  Check,
  X,
  RefreshCw,
  Box,
  Plus,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import { Batch, Kit, InventoryItem, Product } from '@/types';

type ScanMode = 'choose' | 'batch' | 'kit';
type BatchStep = 'scan_batch' | 'scanning' | 'finished';
type KitStep = 'scan_kit' | 'scanning' | 'finished';

export default function ScanPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>('choose');

  // ----------------------------------------------------
  // Batch Flow State
  // ----------------------------------------------------
  const [batchStep, setBatchStep] = useState<BatchStep>('scan_batch');
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [batchProducts, setBatchProducts] = useState<InventoryItem[]>([]);
  const [activeBatchProduct, setActiveBatchProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);

  // ----------------------------------------------------
  // Kit Flow State
  // ----------------------------------------------------
  const [kitStep, setKitStep] = useState<KitStep>('scan_kit');
  const [currentKit, setCurrentKit] = useState<Kit | null>(null);
  const [kitProducts, setKitProducts] = useState<InventoryItem[]>([]);

  // ----------------------------------------------------
  // Product Selector State & Cache
  // ----------------------------------------------------
  const [productsMaster, setProductsMaster] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  // ----------------------------------------------------
  // Transient Feedback & Notifications
  // ----------------------------------------------------
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{ title: string; subtitle: string } | null>(null);
  const [floatingToast, setFloatingToast] = useState<{ serial: string; productName: string } | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{
    title: string;
    serial: string;
    productName?: string;
    batchCode?: string;
    kitCode?: string | null;
    status?: string;
    createdAt?: string;
    message: string;
  } | null>(null);

  // Load master products once
  useEffect(() => {
    fetch('/api/products?activeOnly=true&limit=250')
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProductsMaster(data.products);
          setCategories(data.categories || []);
        }
      })
      .catch((err) => console.error('Failed to load products master:', err));
  }, []);

  // Load recently selected products from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scan_recent_products');
      if (saved) {
        setRecentProducts(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save recent products helper
  const saveRecentProduct = (product: Product) => {
    setRecentProducts((prev) => {
      const filtered = prev.filter((p) => p.partCode !== product.partCode);
      const updated = [product, ...filtered].slice(0, 6);
      try {
        localStorage.setItem('scan_recent_products', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Auto-clear floating toast after 2 seconds
  useEffect(() => {
    if (floatingToast) {
      const timer = setTimeout(() => setFloatingToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [floatingToast]);

  // Auto-clear success banner after 3.5 seconds
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // Filtered products for modal
  const filteredProducts = productsMaster.filter((p) => {
    const matchesSearch =
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.partCode.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCat = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Calculate product breakdown in current batch
  const productBreakdown = batchProducts.reduce<Record<string, { name: string; count: number }>>((acc, item) => {
    const key = item.partCode || item.productName;
    if (!acc[key]) {
      acc[key] = { name: item.productName, count: 0 };
    }
    acc[key].count += 1;
    return acc;
  }, {});

  // ----------------------------------------------------
  // BATCH HANDLERS
  // ----------------------------------------------------

  // 1. Scan Batch QR Code (e.g. BAT-A00001)
  const handleScanBatchQR = async (scannedCode: string) => {
    const cleaned = scannedCode.trim();
    if (!cleaned) return;

    if (!cleaned.toUpperCase().startsWith('BAT-')) {
      setErrorMessage(`Scanned "${cleaned}". Please scan a Batch QR starting with "BAT-" (e.g. BAT-A00001).`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setDuplicateAlert(null);

    try {
      const res = await fetch('/api/scan/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleaned }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to scan batch');
        return;
      }

      setCurrentBatch(data.batch);
      setBatchProducts(data.products || []);
      setBatchStep('scanning');

      // Prompt for product selection immediately
      setIsProductModalOpen(true);
    } catch {
      setErrorMessage('Unable to connect to the server. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Select product for batch packing
  const handleSelectProduct = (product: Product) => {
    setActiveBatchProduct(product);
    saveRecentProduct(product);
    setIsProductModalOpen(false);
    setProductSearch('');
    setCategoryFilter('');

    setSuccessBanner({
      title: '✓ Product Selected',
      subtitle: `${product.name} (${product.partCode}) — Ready to scan serial stickers!`,
    });
  };

  // 3. Continuous Multi-Quantity Serial Scanning into Batch
  const handleContinuousSerialScan = async (serialCode: string) => {
    const cleaned = serialCode.trim();
    if (!cleaned || !currentBatch) return;

    // Guard: ensure active product is selected
    if (!activeBatchProduct) {
      setIsProductModalOpen(true);
      setErrorMessage('Please select a product before scanning serials.');
      return;
    }

    // Guard: ignore if worker accidentally scanned a batch code while scanning serials
    if (cleaned.toUpperCase().startsWith('BAT-')) {
      setErrorMessage(`You are currently scanning items for batch ${currentBatch.code}. Finish this batch before scanning a new batch code.`);
      return;
    }

    // Fast client-side duplicate check (0ms response)
    if (batchProducts.some((item) => item.serialCode.toUpperCase() === cleaned.toUpperCase())) {
      setDuplicateAlert({
        title: '⚠ Already Registered in this Batch',
        serial: cleaned,
        productName: activeBatchProduct.name,
        batchCode: currentBatch.code,
        message: `Serial ${cleaned} was already scanned into this batch.`,
      });
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scan/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          serialCode: cleaned,
          batchCode: currentBatch.code,
          productId: activeBatchProduct._id?.toString() || activeBatchProduct.partCode,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // DUPLICATE DETECTED
        setDuplicateAlert({
          title: '⚠ Already Registered',
          serial: cleaned,
          productName: data.item?.productName || activeBatchProduct.name,
          batchCode: data.item?.batchCode,
          kitCode: data.item?.kitCode,
          status: data.item?.status,
          createdAt: data.item?.createdAt,
          message: data.error || 'This QR has already been registered in inventory.',
        });
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to add serial to batch');
        return;
      }

      // SUCCESS: Add item, update count, show non-blocking floating pill
      const newItem = data.item;
      setBatchProducts((prev) => [newItem, ...prev]);
      setCurrentBatch((prev) => (prev ? { ...prev, productCount: prev.productCount + 1 } : null));

      setFloatingToast({
        serial: cleaned,
        productName: activeBatchProduct.name,
      });
    } catch {
      setErrorMessage('Failed to save serial. Please check your network.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------
  // KIT HANDLERS
  // ----------------------------------------------------

  const handleScanKitQR = async (scannedCode: string) => {
    const cleaned = scannedCode.trim();
    if (!cleaned) return;

    if (!cleaned.toUpperCase().startsWith('KIT-')) {
      setErrorMessage(`Scanned "${cleaned}". Please scan a Kit QR starting with "KIT-" (e.g. KIT-A00001).`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setDuplicateAlert(null);

    try {
      const res = await fetch('/api/scan/kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleaned }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to scan kit');
        return;
      }

      setCurrentKit(data.kit);
      setKitProducts(data.products || []);
      setKitStep('scanning');
    } catch {
      setErrorMessage('Unable to connect to the server. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanProductForKit = async (serialCode: string) => {
    const cleaned = serialCode.trim();
    if (!cleaned || !currentKit) return;

    if (cleaned.toUpperCase().startsWith('KIT-')) {
      setErrorMessage(`You are currently scanning items for kit ${currentKit.code}. Finish this kit before scanning a new kit code.`);
      return;
    }

    if (kitProducts.some((item) => item.serialCode.toUpperCase() === cleaned.toUpperCase())) {
      setDuplicateAlert({
        title: '⚠ Already in this Kit',
        serial: cleaned,
        kitCode: currentKit.code,
        message: `Serial ${cleaned} is already part of this kit.`,
      });
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/kit/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          kitCode: currentKit.code,
          serialCode: cleaned,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setDuplicateAlert({
          title: '⚠ Already Assigned To Kit',
          serial: cleaned,
          productName: data.item?.productName,
          batchCode: data.item?.batchCode,
          kitCode: data.item?.kitCode,
          message: data.error || 'This product is already assigned to a kit.',
        });
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to add product to kit');
        return;
      }

      setKitProducts((prev) => [data.item, ...prev]);
      setCurrentKit((prev) => (prev ? { ...prev, itemCount: prev.itemCount + 1 } : null));

      setFloatingToast({
        serial: cleaned,
        productName: data.item?.productName || 'Product',
      });
    } catch {
      setErrorMessage('Failed to add product to kit.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setMode('choose');
    setBatchStep('scan_batch');
    setCurrentBatch(null);
    setBatchProducts([]);
    setActiveBatchProduct(null);
    setIsProductModalOpen(false);

    setKitStep('scan_kit');
    setCurrentKit(null);
    setKitProducts([]);

    setErrorMessage(null);
    setDuplicateAlert(null);
    setSuccessBanner(null);
    setFloatingToast(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Top Bar with Mode and Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2">
          {mode !== 'choose' && (
            <button
              type="button"
              onClick={resetAll}
              className="p-1 border border-[#E5E5E5] rounded hover:bg-neutral-100 text-[#111111] transition"
              title="Back to Mode Selection"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="text-base font-bold text-[#111111]">
            {mode === 'choose'
              ? 'Warehouse Scanning'
              : mode === 'batch'
              ? `Batch Mode: ${currentBatch ? currentBatch.code : 'Scan Batch'}`
              : `Kit Mode: ${currentKit ? currentKit.code : 'Scan Kit'}`}
          </h1>
        </div>

        {mode !== 'choose' && (
          <button
            type="button"
            onClick={resetAll}
            className="text-xs font-semibold px-2.5 py-1 border border-[#E5E5E5] rounded hover:bg-neutral-100 text-[#666666]"
          >
            Change Mode
          </button>
        )}
      </div>

      {/* Notifications / Success Banner */}
      {successBanner && (
        <div className="p-3 bg-neutral-900 text-white rounded flex items-center justify-between animate-fadeIn">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {successBanner.title}
            </div>
            <div className="text-xs text-neutral-300 mt-0.5">{successBanner.subtitle}</div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-white border-2 border-black rounded text-xs text-black flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Notice: </span>
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-neutral-500 hover:text-black"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Duplicate Product Scan Modal / Warning */}
      {duplicateAlert && (
        <div className="p-4 bg-white border-2 border-black rounded shadow-none space-y-3">
          <div className="flex items-center gap-2 text-black font-black text-sm">
            <AlertTriangle className="w-5 h-5 text-black" />
            {duplicateAlert.title}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#E5E5E5]">
            <div>
              <span className="text-[#666666] block">QR Code:</span>
              <span className="font-bold font-mono text-[#111111]">{duplicateAlert.serial}</span>
            </div>
            {duplicateAlert.productName && (
              <div>
                <span className="text-[#666666] block">Product Name:</span>
                <span className="font-bold text-[#111111]">{duplicateAlert.productName}</span>
              </div>
            )}
            {duplicateAlert.batchCode && (
              <div>
                <span className="text-[#666666] block">Batch:</span>
                <span className="font-bold font-mono text-[#111111]">{duplicateAlert.batchCode}</span>
              </div>
            )}
            {duplicateAlert.kitCode && (
              <div>
                <span className="text-[#666666] block">Current Kit:</span>
                <span className="font-bold font-mono text-[#111111]">{duplicateAlert.kitCode}</span>
              </div>
            )}
            {duplicateAlert.createdAt && (
              <div>
                <span className="text-[#666666] block">Registered On:</span>
                <span className="text-[#111111]">
                  {new Date(duplicateAlert.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-[#666666] block">Current Status:</span>
              <span className="font-bold text-[#111111]">
                {duplicateAlert.status || 'Already assigned'}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#555555]">{duplicateAlert.message}</p>

          <button
            type="button"
            onClick={() => setDuplicateAlert(null)}
            className="w-full py-2 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
          >
            Dismiss & Continue Scanning
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 1. INITIAL SCREEN: WHAT WOULD YOU LIKE TO SCAN?                    */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'choose' && (
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-[#111111]">What would you like to scan?</h2>
            <p className="text-xs text-[#666666]">
              Select an operation to open the warehouse mobile scanner
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* BATCH BUTTON */}
            <button
              type="button"
              onClick={() => {
                setMode('batch');
                setBatchStep('scan_batch');
              }}
              className="p-6 bg-white border-2 border-black rounded text-left hover:bg-neutral-50 transition flex flex-col justify-between min-h-[160px] group"
            >
              <div className="p-3 bg-black text-white rounded w-fit group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-black text-[#111111] tracking-wide">BATCH</div>
                <div className="text-xs text-[#666666] mt-0.5">
                  Scan batch QR (BAT-*), select product, and scan multiple serials continuously into the batch
                </div>
              </div>
            </button>

            {/* KIT BUTTON */}
            <button
              type="button"
              onClick={() => {
                setMode('kit');
                setKitStep('scan_kit');
              }}
              className="p-6 bg-white border-2 border-black rounded text-left hover:bg-neutral-50 transition flex flex-col justify-between min-h-[160px] group"
            >
              <div className="p-3 bg-black text-white rounded w-fit group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-black text-[#111111] tracking-wide">KIT</div>
                <div className="text-xs text-[#666666] mt-0.5">
                  Scan kit QR (KIT-*) and continuously add registered serialized products into a kit
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. BATCH SCANNING FLOW (Continuous Scanner Stream)                 */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'batch' && batchStep !== 'finished' && (
        <div className="space-y-4">
          {/* Header Card for Batch Mode */}
          {batchStep === 'scan_batch' ? (
            <div className="p-3 bg-neutral-100 border border-[#E5E5E5] rounded text-center">
              <h3 className="text-sm font-bold text-[#111111]">Scan Batch Label</h3>
              <p className="text-xs text-[#666666] mt-0.5">
                Point camera at the batch label (Format: <span className="font-mono font-bold">BAT-A00001</span>)
              </p>
            </div>
          ) : (
            currentBatch && (
              <div className="p-3.5 bg-neutral-50 border border-[#E5E5E5] rounded-lg space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                  <div>
                    <span className="text-[10px] text-[#666666] uppercase font-bold tracking-wider block">
                      Active Batch
                    </span>
                    <span className="text-base font-black font-mono text-[#111111]">
                      {currentBatch.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right pr-2 border-r border-[#E5E5E5]">
                      <span className="text-[10px] text-[#666666] uppercase font-bold tracking-wider block">
                        Total Scanned
                      </span>
                      <span className="text-base font-black text-[#111111]">
                        {batchProducts.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBatchStep('finished')}
                      className="text-xs font-bold px-3 py-1.5 bg-neutral-200 text-[#111111] hover:bg-neutral-300 rounded transition"
                    >
                      Finish Batch
                    </button>
                  </div>
                </div>

                {/* Active Product Selected Bar & Switch Action */}
                <div className="flex items-center justify-between bg-white border border-[#E5E5E5] p-2.5 rounded">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className="p-1.5 bg-black text-white rounded flex-shrink-0">
                      <Box className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-[#666666] font-semibold uppercase tracking-wider">
                        Current Product:
                      </div>
                      <div className="text-xs font-bold text-[#111111] truncate">
                        {activeBatchProduct ? activeBatchProduct.name : 'No product selected'}
                      </div>
                      {activeBatchProduct && (
                        <div className="text-[10px] font-mono text-[#777777]">
                          {activeBatchProduct.partCode} • {activeBatchProduct.category}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(true)}
                    className="flex-shrink-0 text-xs font-bold px-3 py-1.5 bg-black text-white rounded hover:bg-neutral-800 transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{activeBatchProduct ? 'Change Product' : 'Select Product'}</span>
                  </button>
                </div>
              </div>
            )
          )}

          {/* Scanner Viewfinder Box (Stays mounted continuously to prevent reload!) */}
          <div className="relative">
            <BarcodeScanner
              onScan={batchStep === 'scan_batch' ? handleScanBatchQR : handleContinuousSerialScan}
              isProcessing={isProcessing || isProductModalOpen}
              expectedType={batchStep === 'scan_batch' ? 'batch' : 'serial'}
              placeholderText={
                batchStep === 'scan_batch'
                  ? 'Scan a batch QR (e.g. BAT-A00001)'
                  : activeBatchProduct
                  ? `Scan serials for ${activeBatchProduct.name}`
                  : 'Select a product first to start scanning'
              }
            />

            {/* Non-blocking floating toast over camera on successful multi-scan */}
            {floatingToast && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black text-white px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg animate-fadeIn z-20 pointer-events-none">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono">{floatingToast.serial}</span>
                <span className="text-neutral-300">Added!</span>
              </div>
            )}
          </div>

          {/* Scanned Items in Batch (Live Counter & Breakdown) */}
          {batchStep === 'scanning' && currentBatch && (
            <div className="border border-[#E5E5E5] rounded-lg p-3 bg-white space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#E5E5E5] pb-2">
                <span className="font-bold text-[#111111]">Batch Content: {currentBatch.code}</span>
                <span className="text-[#666666] font-mono">{batchProducts.length} item(s)</span>
              </div>

              {/* Product breakdown tags */}
              {Object.keys(productBreakdown).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(productBreakdown).map(([code, info]) => (
                    <span
                      key={code}
                      className="text-[11px] px-2 py-0.5 bg-neutral-100 border border-[#E5E5E5] rounded font-medium text-[#111111]"
                    >
                      <strong className="font-bold">{info.count}x</strong> {info.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Scanned Serial List */}
              {batchProducts.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1 pt-1 divide-y divide-[#F0F0F0]">
                  {batchProducts.map((item, idx) => (
                    <div
                      key={item._id?.toString() || `${item.serialCode}-${idx}`}
                      className="flex items-center justify-between py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-black flex-shrink-0" />
                        <div>
                          <span className="font-mono font-bold text-[#111111]">{item.serialCode}</span>
                          <span className="text-[#666666] ml-2">{item.productName}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#888888] font-mono">
                        {item.partCode}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-[#888888]">
                  No products scanned yet. Select a product and point camera at serial QR codes.
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  className="flex-1 py-2 bg-white text-[#111111] border border-black text-xs font-bold rounded hover:bg-neutral-50 transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Item / Switch Product</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBatchStep('finished')}
                  className="flex-1 py-2 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
                >
                  Finish Batch ({batchProducts.length})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. PRODUCT SELECTION MODAL (Asks item/product after batch scan)     */}
      {/* ------------------------------------------------------------------ */}
      {isProductModalOpen && currentBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-t-xl sm:rounded-xl border border-[#E5E5E5] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Select Item / Product</h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  Assign to Batch: <span className="font-mono font-bold text-[#111111]">{currentBatch.code}</span>
                </p>
              </div>
              {activeBatchProduct && (
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1 text-[#666666] hover:text-[#111111] rounded hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Quick Chips: Recently Selected Products */}
            {recentProducts.length > 0 && (
              <div className="p-3 bg-neutral-50 border-b border-[#E5E5E5] space-y-1.5">
                <span className="text-[10px] text-[#666666] uppercase font-bold tracking-wider block">
                  Quick Select (Recently Packed):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recentProducts.map((p) => (
                    <button
                      key={p.partCode}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className={`text-xs px-2.5 py-1 rounded border transition flex items-center gap-1.5 ${
                        activeBatchProduct?.partCode === p.partCode
                          ? 'bg-black text-white border-black font-bold'
                          : 'bg-white text-[#111111] border-[#E5E5E5] hover:bg-neutral-100'
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className="text-[9px] opacity-70 font-mono">({p.partCode})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Bar & Category Dropdown Filter */}
            <div className="p-3 border-b border-[#E5E5E5] flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product name or part code..."
                  className="w-full text-xs px-3 py-2 pl-7 border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-sans"
                  autoFocus
                />
                <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2 top-1/2 -translate-y-1/2" />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs px-2 py-1.5 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Scrollable Products List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E5E5E5] p-1">
              {filteredProducts.slice(0, 50).map((p) => {
                const isSelected = activeBatchProduct?.partCode === p.partCode;
                return (
                  <button
                    key={p.partCode}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition rounded ${
                      isSelected
                        ? 'bg-neutral-100 font-bold border-l-4 border-black'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-[#111111] font-semibold">{p.name}</div>
                      <div className="text-[10px] text-[#777777] font-mono mt-0.5">
                        {p.partCode} • {p.category}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <span className="text-[11px] text-[#666666]">{p.unit}</span>
                      <ChevronRight className="w-4 h-4 text-[#888888]" />
                    </div>
                  </button>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-xs text-[#888888]">
                  No products matched your search.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {activeBatchProduct && (
              <div className="p-3 border-t border-[#E5E5E5] bg-neutral-50 flex justify-between items-center">
                <span className="text-xs text-[#666666]">
                  Active: <strong>{activeBatchProduct.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-1.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
                >
                  Continue Scanning
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. FINISHED BATCH SUMMARY VIEW                                     */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'batch' && batchStep === 'finished' && currentBatch && (
        <div className="p-6 bg-white border border-[#E5E5E5] rounded text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-black mx-auto" />
          <div>
            <h3 className="text-base font-black text-[#111111]">Batch Completed</h3>
            <p className="text-xs text-[#666666] mt-0.5 font-mono">{currentBatch.code}</p>
            <p className="text-sm font-bold text-[#111111] mt-2">
              Total Products in Batch: {batchProducts.length}
            </p>
          </div>

          {/* Breakdown summary */}
          {Object.keys(productBreakdown).length > 0 && (
            <div className="p-3 bg-neutral-50 border border-[#E5E5E5] rounded text-left text-xs space-y-1">
              <span className="font-bold text-[#111111] block mb-1">Product Breakdown:</span>
              {Object.entries(productBreakdown).map(([code, info]) => (
                <div key={code} className="flex justify-between py-0.5">
                  <span className="text-[#555555]">{info.name}</span>
                  <span className="font-bold font-mono text-[#111111]">{info.count} items</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setBatchStep('scanning');
              }}
              className="py-2.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
            >
              Continue Adding to This Batch
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="py-2.5 border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded hover:bg-neutral-100 transition"
            >
              Scan Another Batch or Kit
            </button>
            <button
              type="button"
              onClick={() => router.push(`/batches/${currentBatch.code}`)}
              className="py-2.5 text-xs text-[#666666] hover:text-black underline"
            >
              View Batch Details Page →
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. KIT SCANNING FLOW (Continuous Scanner Stream)                   */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'kit' && kitStep !== 'finished' && (
        <div className="space-y-4">
          {kitStep === 'scan_kit' ? (
            <div className="p-3 bg-neutral-100 border border-[#E5E5E5] rounded text-center">
              <h3 className="text-sm font-bold text-[#111111]">Scan Kit Label</h3>
              <p className="text-xs text-[#666666] mt-0.5">
                Point camera at the kit label (Format: <span className="font-mono font-bold">KIT-A00001</span>)
              </p>
            </div>
          ) : (
            currentKit && (
              <div className="p-3 bg-neutral-100 border border-[#E5E5E5] rounded flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#666666] uppercase block font-semibold">Active Kit</span>
                  <span className="text-sm font-black font-mono text-[#111111]">{currentKit.code}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#666666] block font-semibold">Products in Kit</span>
                  <span className="text-sm font-bold text-[#111111]">{kitProducts.length}</span>
                </div>
              </div>
            )
          )}

          {/* Scanner Viewfinder Box */}
          <div className="relative">
            <BarcodeScanner
              onScan={kitStep === 'scan_kit' ? handleScanKitQR : handleScanProductForKit}
              isProcessing={isProcessing}
              expectedType={kitStep === 'scan_kit' ? 'kit' : 'serial'}
              placeholderText={
                kitStep === 'scan_kit'
                  ? 'Scan a kit QR (e.g. KIT-A00001)'
                  : `Scan serial for ${currentKit?.code}`
              }
            />

            {/* Non-blocking floating toast over camera */}
            {floatingToast && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black text-white px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg animate-fadeIn z-20 pointer-events-none">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono">{floatingToast.serial}</span>
                <span className="text-neutral-300">Added to Kit!</span>
              </div>
            )}
          </div>

          {/* Kit Products List */}
          {kitStep === 'scanning' && currentKit && (
            <div className="border border-[#E5E5E5] rounded p-3 bg-white space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#111111] border-b border-[#E5E5E5] pb-2">
                <span className="font-mono">{currentKit.code}</span>
                <span>Products in Kit: {kitProducts.length}</span>
              </div>

              {kitProducts.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                  {kitProducts.map((item, idx) => (
                    <div
                      key={item._id?.toString() || `${item.serialCode}-${idx}`}
                      className="flex items-center justify-between py-1.5 px-2 border border-[#E5E5E5] rounded text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#111111]">{item.serialCode}</span>
                        <span className="text-[#666666] ml-2">{item.productName}</span>
                      </div>
                      <span className="text-[10px] text-[#888888] font-mono">{item.batchCode}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#888888] py-2 text-center">
                  No products added to this kit yet. Scan serial codes above.
                </p>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setKitStep('finished')}
                  className="w-full py-2 bg-neutral-100 text-[#111111] border border-[#E5E5E5] text-xs font-bold rounded hover:bg-neutral-200 transition"
                >
                  Finish Kit ({kitProducts.length})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. FINISHED KIT SUMMARY VIEW                                       */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'kit' && kitStep === 'finished' && currentKit && (
        <div className="p-6 bg-white border border-[#E5E5E5] rounded text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-black mx-auto" />
          <div>
            <h3 className="text-base font-black text-[#111111]">Kit Completed</h3>
            <p className="text-xs text-[#666666] mt-0.5 font-mono">{currentKit.code}</p>
            <p className="text-sm font-bold text-[#111111] mt-2">
              Total Products in Kit: {kitProducts.length}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setKitStep('scanning');
              }}
              className="py-2.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
            >
              Continue Adding to This Kit
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="py-2.5 border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded hover:bg-neutral-100 transition"
            >
              Scan Another Batch or Kit
            </button>
            <button
              type="button"
              onClick={() => router.push(`/kits/${currentKit.code}`)}
              className="py-2.5 text-xs text-[#666666] hover:text-black underline"
            >
              View Kit Details Page →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
