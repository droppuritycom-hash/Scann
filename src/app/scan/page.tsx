'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
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
  Scan as ScanIcon,
  RefreshCw,
  Plus,
  Box,
} from 'lucide-react';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import { Batch, Kit, InventoryItem, Product } from '@/types';

type ScanMode = 'choose' | 'batch' | 'kit';

type BatchStep =
  | 'scan_batch'
  | 'batch_ready'
  | 'scanning_product'
  | 'product_confirm'
  | 'finished';

type KitStep =
  | 'scan_kit'
  | 'scanning_product'
  | 'product_confirm'
  | 'finished';

export default function ScanPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>('choose');

  // Batch Flow State
  const [batchStep, setBatchStep] = useState<BatchStep>('scan_batch');
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [batchProducts, setBatchProducts] = useState<InventoryItem[]>([]);
  const [pendingSerial, setPendingSerial] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  // Kit Flow State
  const [kitStep, setKitStep] = useState<KitStep>('scan_kit');
  const [currentKit, setCurrentKit] = useState<Kit | null>(null);
  const [kitProducts, setKitProducts] = useState<InventoryItem[]>([]);
  const [pendingKitSerialItem, setPendingKitSerialItem] = useState<Partial<InventoryItem> | null>(null);

  // Common Notification & Loading State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{ title: string; subtitle: string } | null>(null);
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

  // Master Products Cache for Searchable Selector
  const [productsMaster, setProductsMaster] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch Master Products once
  useEffect(() => {
    fetch('/api/products?activeOnly=true&limit=250')
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProductsMaster(data.products);
          setCategories(data.categories || []);
        }
      })
      .catch((err) => console.error('Failed to load products:', err));
  }, []);

  // Filter products for the fast selector
  const filteredProducts = productsMaster.filter((p) => {
    const matchesSearch =
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.partCode.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCat = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Clear transient notifications after 3 seconds
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // ----------------------------------------------------
  // BATCH FLOW HANDLERS
  // ----------------------------------------------------

  const handleScanBatchQR = async (scannedCode: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setDuplicateAlert(null);

    try {
      const res = await fetch('/api/scan/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: scannedCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to scan batch');
        return;
      }

      setCurrentBatch(data.batch);
      setBatchProducts(data.products || []);
      setBatchStep('batch_ready');
    } catch {
      setErrorMessage('Unable to connect to the server. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanProductForBatch = async (serialCode: string) => {
    if (!currentBatch) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setDuplicateAlert(null);

    try {
      // 1. First verify if serial is already in inventory
      const res = await fetch('/api/scan/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          serialCode,
          batchCode: currentBatch.code,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // DUPLICATE DETECTED
        setDuplicateAlert({
          title: '⚠ Already Registered',
          serial: data.item?.serialCode || serialCode,
          productName: data.item?.productName,
          batchCode: data.item?.batchCode,
          kitCode: data.item?.kitCode,
          status: data.item?.status,
          createdAt: data.item?.createdAt,
          message: data.error,
        });
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid product serial');
        return;
      }

      // Valid & Unregistered Serial!
      setPendingSerial(serialCode);
      if (data.suggestedProduct) {
        setSelectedProduct(data.suggestedProduct);
      }
      setBatchStep('product_confirm');
    } catch {
      setErrorMessage('Unable to connect to the server. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAddProductToBatch = async () => {
    if (!currentBatch || !pendingSerial || !selectedProduct) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scan/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          serialCode: pendingSerial,
          batchCode: currentBatch.code,
          productId: selectedProduct._id?.toString() || selectedProduct.partCode,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setDuplicateAlert({
          title: '⚠ Already Registered',
          serial: pendingSerial,
          productName: data.item?.productName,
          batchCode: data.item?.batchCode,
          kitCode: data.item?.kitCode,
          status: data.item?.status,
          createdAt: data.item?.createdAt,
          message: data.error,
        });
        setBatchStep('scanning_product');
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to add product');
        return;
      }

      // Track recent products for faster sequential adding
      setRecentProducts((prev) => {
        const filtered = prev.filter((p) => p.partCode !== selectedProduct.partCode);
        return [selectedProduct, ...filtered].slice(0, 5);
      });

      // Update live product list
      setBatchProducts((prev) => [data.item, ...prev]);
      setCurrentBatch((prev) => prev ? { ...prev, productCount: prev.productCount + 1 } : null);

      // Show success feedback
      setSuccessBanner({
        title: '✓ Product Added',
        subtitle: `${pendingSerial} — ${selectedProduct.name}`,
      });

      // AUTOMATICALLY CONTINUE SCANNING NEXT PRODUCT
      setPendingSerial('');
      setProductSearch('');
      setBatchStep('scanning_product');
    } catch {
      setErrorMessage('Failed to save. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------
  // KIT FLOW HANDLERS
  // ----------------------------------------------------

  const handleScanKitQR = async (scannedCode: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setDuplicateAlert(null);

    try {
      const res = await fetch('/api/scan/kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: scannedCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to scan kit');
        return;
      }

      setCurrentKit(data.kit);
      setKitProducts(data.products || []);
      setKitStep('scanning_product');
    } catch {
      setErrorMessage('Unable to connect to the server. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanProductForKit = async (serialCode: string) => {
    if (!currentKit) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setDuplicateAlert(null);

    try {
      // 1. Verify product exists and check kit assignment
      const res = await fetch('/api/kit/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          kitCode: currentKit.code,
          serialCode,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // ALREADY ASSIGNED TO A KIT (Rule 10)
        setDuplicateAlert({
          title: '⚠ Already Assigned To Kit',
          serial: serialCode,
          productName: data.productName,
          batchCode: data.currentBatch,
          kitCode: data.currentKit,
          message: `This product is already assigned to ${data.currentKit}.`,
        });
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.error || 'Product cannot be added to kit');
        return;
      }

      // Valid existing product ready to be added to this kit!
      setPendingKitSerialItem(data.item);
      setKitStep('product_confirm');
    } catch {
      setErrorMessage('Unable to connect to the server. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAddProductToKit = async () => {
    if (!currentKit || !pendingKitSerialItem?.serialCode) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/kit/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          kitCode: currentKit.code,
          serialCode: pendingKitSerialItem.serialCode,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setDuplicateAlert({
          title: '⚠ Already Assigned To Kit',
          serial: pendingKitSerialItem.serialCode,
          kitCode: data.item?.kitCode,
          message: data.error,
        });
        setKitStep('scanning_product');
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to add item to kit');
        return;
      }

      // Update live kit product list
      setKitProducts((prev) => [data.item, ...prev]);
      setCurrentKit((prev) => prev ? { ...prev, itemCount: prev.itemCount + 1 } : null);

      setSuccessBanner({
        title: '✓ Added to Kit',
        subtitle: `${pendingKitSerialItem.serialCode} — ${pendingKitSerialItem.productName} associated with ${currentKit.code}`,
      });

      // Automatically continue scanning next product for kit
      setPendingKitSerialItem(null);
      setKitStep('scanning_product');
    } catch {
      setErrorMessage('Failed to save. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setMode('choose');
    setBatchStep('scan_batch');
    setCurrentBatch(null);
    setBatchProducts([]);
    setPendingSerial('');
    setSelectedProduct(null);
    setKitStep('scan_kit');
    setCurrentKit(null);
    setKitProducts([]);
    setPendingKitSerialItem(null);
    setErrorMessage(null);
    setDuplicateAlert(null);
    setSuccessBanner(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Top Bar with Mode and Back Button */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2">
          {mode !== 'choose' && (
            <button
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
            <div className="text-xs text-neutral-300 mt-0.5 font-mono">{successBanner.subtitle}</div>
          </div>
          <button
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
            <span className="font-bold">Error: </span>
            {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-neutral-500 hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Duplicate Product Scan Modal / Card - STRICT COMPLIANCE (Section 2 & 7) */}
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
                <span className="text-[#111111]">{new Date(duplicateAlert.createdAt).toLocaleDateString()}</span>
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
            onClick={() => setDuplicateAlert(null)}
            className="w-full py-2 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
          >
            Dismiss & Continue Scanning
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 1. INITIAL SCREEN: WHAT WOULD YOU LIKE TO SCAN? (Section 3)        */}
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
                  Scan batch QR (BAT-*) to register and pair serialized products into a batch
                </div>
              </div>
            </button>

            {/* KIT BUTTON */}
            <button
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
                  Scan kit QR (KIT-*) to assemble registered serialized products into a kit
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. BATCH SCANNING FLOW (Section 4, 5, 6, 7)                        */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'batch' && (
        <div className="space-y-4">
          {/* STEP 1: Scan Batch QR */}
          {batchStep === 'scan_batch' && (
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="text-sm font-bold text-[#111111]">Scan Batch QR</h3>
                <p className="text-xs text-[#666666]">
                  Point camera at the batch label (Format: BAT-A00001)
                </p>
              </div>

              <BarcodeScanner
                onScan={handleScanBatchQR}
                isProcessing={isProcessing}
                expectedType="batch"
                placeholderText="Scan a batch QR (e.g. BAT-A00001)"
              />
            </div>
          )}

          {/* STEP 2: Batch Ready confirmation */}
          {batchStep === 'batch_ready' && currentBatch && (
            <div className="p-6 bg-white border border-[#E5E5E5] rounded text-center space-y-4">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-[#666666] uppercase tracking-wider font-semibold">Batch</div>
                <div className="text-2xl font-black font-mono text-[#111111]">{currentBatch.code}</div>
                <div className="text-xs text-[#666666] mt-1">
                  Status:{' '}
                  <span className="font-bold text-emerald-600">Ready for Product Scanning</span>
                </div>
                <div className="text-xs text-[#888888] mt-0.5">
                  Currently {batchProducts.length} product(s) registered in this batch
                </div>
              </div>

              <button
                onClick={() => setBatchStep('scanning_product')}
                className="w-full py-3 bg-black text-white font-bold text-sm rounded hover:bg-neutral-800 transition"
              >
                Start Scanning Products
              </button>
            </div>
          )}

          {/* STEP 3: Continuous Product Scanning Inside Batch */}
          {batchStep === 'scanning_product' && currentBatch && (
            <div className="space-y-4">
              {/* Batch Banner Header */}
              <div className="p-3 bg-neutral-100 border border-[#E5E5E5] rounded flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#666666] uppercase block font-semibold">Current Batch</span>
                  <span className="text-sm font-black font-mono text-[#111111]">{currentBatch.code}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#666666] block font-semibold">Products Scanned</span>
                  <span className="text-sm font-bold text-[#111111]">{batchProducts.length}</span>
                </div>
              </div>

              {/* Camera Scanner */}
              <BarcodeScanner
                onScan={handleScanProductForBatch}
                isProcessing={isProcessing}
                expectedType="serial"
                placeholderText="Scan product serial QR (e.g. A00001)"
              />

              {/* Compact Live List of Scanned Products (Section 6) */}
              {batchProducts.length > 0 && (
                <div className="border border-[#E5E5E5] rounded p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#111111] border-b border-[#E5E5E5] pb-2">
                    <span>Batch: {currentBatch.code}</span>
                    <span>Products Scanned: {batchProducts.length}</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                    {batchProducts.map((item, idx) => (
                      <div
                        key={item._id?.toString() || idx}
                        className="flex items-center justify-between py-1.5 px-2 border border-[#E5E5E5] rounded text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-black" />
                          <div>
                            <span className="font-mono font-bold text-[#111111]">{item.serialCode}</span>
                            <span className="text-[#666666] ml-2">{item.productName}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#888888] font-mono">{item.partCode}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => setBatchStep('finished')}
                      className="w-full py-2 bg-neutral-100 text-[#111111] border border-[#E5E5E5] text-xs font-bold rounded hover:bg-neutral-200 transition"
                    >
                      Finish Batch
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Product Confirmation Modal/View (Section 5) */}
          {batchStep === 'product_confirm' && currentBatch && (
            <div className="p-4 bg-white border-2 border-black rounded space-y-4">
              <div>
                <span className="text-xs text-[#666666] font-semibold block">Serial Scanned</span>
                <span className="text-lg font-black font-mono text-[#111111]">{pendingSerial}</span>
                <span className="text-xs text-[#666666] block mt-0.5">
                  Batch: <span className="font-mono font-bold text-[#111111]">{currentBatch.code}</span>
                </span>
              </div>

              {/* Fast Searchable Product Selector (Section 5) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#111111]">Which product is this?</label>

                {/* Recently Used Quick Buttons */}
                {recentProducts.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#888888] uppercase tracking-wider font-semibold block">
                      Recently Scanned:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {recentProducts.map((p) => (
                        <button
                          key={p.partCode}
                          type="button"
                          onClick={() => setSelectedProduct(p)}
                          className={`text-xs px-2.5 py-1 rounded border transition ${
                            selectedProduct?.partCode === p.partCode
                              ? 'bg-black text-white border-black font-semibold'
                              : 'bg-white text-[#333333] border-[#E5E5E5] hover:bg-neutral-100'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Bar & Category Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search product name or part code..."
                      className="w-full text-xs px-3 py-2 pl-7 border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-sans"
                    />
                    <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2 top-1/2 -translate-y-1/2" />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-xs px-2 py-1.5 border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-black"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Product List Selector */}
                <div className="max-h-40 overflow-y-auto border border-[#E5E5E5] rounded divide-y divide-[#E5E5E5]">
                  {filteredProducts.slice(0, 30).map((p) => (
                    <button
                      key={p.partCode}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition ${
                        selectedProduct?.partCode === p.partCode
                          ? 'bg-neutral-100 font-bold'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div>
                        <div className="text-[#111111]">{p.name}</div>
                        <div className="text-[10px] text-[#777777] font-mono">{p.partCode} • {p.category}</div>
                      </div>
                      <div className="text-[11px] text-[#666666]">
                        {p.unit} • GST {p.gst}%
                      </div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="p-3 text-center text-xs text-[#888888]">
                      No products match your search.
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation Card Details (Section 5) */}
              {selectedProduct && (
                <div className="p-3 bg-neutral-50 border border-[#E5E5E5] rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Product:</span>
                    <span className="font-bold text-[#111111]">{selectedProduct.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Part Code:</span>
                    <span className="font-mono text-[#111111]">{selectedProduct.partCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Unit:</span>
                    <span className="text-[#111111]">{selectedProduct.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666666]">GST:</span>
                    <span className="text-[#111111]">{selectedProduct.gst}%</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#E5E5E5]">
                    <span className="text-[#666666]">Serial:</span>
                    <span className="font-mono font-bold text-[#111111]">{pendingSerial}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Batch:</span>
                    <span className="font-mono font-bold text-[#111111]">{currentBatch.code}</span>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingSerial('');
                    setSelectedProduct(null);
                    setBatchStep('scanning_product');
                  }}
                  className="flex-1 py-2.5 border border-[#E5E5E5] rounded text-xs font-semibold text-[#111111] hover:bg-neutral-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedProduct || isProcessing}
                  onClick={handleConfirmAddProductToBatch}
                  className="flex-1 py-2.5 bg-black text-white rounded text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {isProcessing ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Finished Batch Summary */}
          {batchStep === 'finished' && currentBatch && (
            <div className="p-6 bg-white border border-[#E5E5E5] rounded text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-black mx-auto" />
              <div>
                <h3 className="text-base font-black text-[#111111]">Batch Completed</h3>
                <p className="text-xs text-[#666666] mt-0.5 font-mono">{currentBatch.code}</p>
                <p className="text-sm font-bold text-[#111111] mt-2">
                  Total Products Added: {batchProducts.length}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    setBatchStep('scanning_product');
                  }}
                  className="py-2.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
                >
                  Continue Adding to This Batch
                </button>
                <button
                  onClick={resetAll}
                  className="py-2.5 border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded hover:bg-neutral-100 transition"
                >
                  Scan Another Batch or Kit
                </button>
                <button
                  onClick={() => router.push(`/batches/${currentBatch.code}`)}
                  className="py-2.5 text-xs text-[#666666] hover:text-black underline"
                >
                  View Batch Details Page →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. KIT SCANNING FLOW (Section 8, 9, 10, 11)                         */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'kit' && (
        <div className="space-y-4">
          {/* STEP 1: Scan Kit QR */}
          {kitStep === 'scan_kit' && (
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="text-sm font-bold text-[#111111]">Scan Kit QR</h3>
                <p className="text-xs text-[#666666]">
                  Point camera at the kit label (Format: KIT-A00001)
                </p>
              </div>

              <BarcodeScanner
                onScan={handleScanKitQR}
                isProcessing={isProcessing}
                expectedType="kit"
                placeholderText="Scan a kit QR (e.g. KIT-A00001)"
              />
            </div>
          )}

          {/* STEP 2: Kit Continuous Product Scanning & Live List (Section 9, 11) */}
          {kitStep === 'scanning_product' && currentKit && (
            <div className="space-y-4">
              {/* Kit Header Banner */}
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

              {/* Camera Scanner for adding product serials */}
              <BarcodeScanner
                onScan={handleScanProductForKit}
                isProcessing={isProcessing}
                expectedType="serial"
                placeholderText="Scan registered product serial (e.g. A00002)"
              />

              {/* Kit Contents Live List (Section 11) */}
              <div className="border border-[#E5E5E5] rounded p-3 bg-white space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#111111] border-b border-[#E5E5E5] pb-2">
                  <span className="font-mono">{currentKit.code}</span>
                  <span>Products: {kitProducts.length}</span>
                </div>

                {kitProducts.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                    {kitProducts.map((item, idx) => (
                      <div
                        key={item._id?.toString() || idx}
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
                    onClick={() => setKitStep('finished')}
                    className="w-full py-2 bg-neutral-100 text-[#111111] border border-[#E5E5E5] text-xs font-bold rounded hover:bg-neutral-200 transition"
                  >
                    Finish Kit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm Adding Product to Kit (Section 9) */}
          {kitStep === 'product_confirm' && currentKit && pendingKitSerialItem && (
            <div className="p-4 bg-white border-2 border-black rounded space-y-4">
              <div className="flex items-center gap-2 text-black font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-black" />
                Product Found
              </div>

              <div className="p-3 bg-neutral-50 border border-[#E5E5E5] rounded text-xs space-y-2">
                <div>
                  <span className="text-[#666666] block">Product:</span>
                  <span className="text-sm font-black text-[#111111]">
                    {pendingKitSerialItem.productName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E5E5E5]">
                  <div>
                    <span className="text-[#666666] block">Serial:</span>
                    <span className="font-mono font-bold text-[#111111]">
                      {pendingKitSerialItem.serialCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#666666] block">Current Batch:</span>
                    <span className="font-mono font-bold text-[#111111]">
                      {pendingKitSerialItem.batchCode}
                    </span>
                  </div>
                </div>
                <div className="pt-1 border-t border-[#E5E5E5]">
                  <span className="text-[#666666] block">Target Kit:</span>
                  <span className="font-mono font-bold text-[#111111]">
                    {currentKit.code}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingKitSerialItem(null);
                    setKitStep('scanning_product');
                  }}
                  className="flex-1 py-2.5 border border-[#E5E5E5] rounded text-xs font-semibold text-[#111111] hover:bg-neutral-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmAddProductToKit}
                  className="flex-1 py-2.5 bg-black text-white rounded text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {isProcessing ? 'Adding...' : 'Add To Kit'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Finished Kit */}
          {kitStep === 'finished' && currentKit && (
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
                  onClick={() => {
                    setKitStep('scanning_product');
                  }}
                  className="py-2.5 bg-black text-white text-xs font-bold rounded hover:bg-neutral-800 transition"
                >
                  Continue Adding to This Kit
                </button>
                <button
                  onClick={resetAll}
                  className="py-2.5 border border-[#E5E5E5] text-[#111111] text-xs font-semibold rounded hover:bg-neutral-100 transition"
                >
                  Scan Another Batch or Kit
                </button>
                <button
                  onClick={() => router.push(`/kits/${currentKit.code}`)}
                  className="py-2.5 text-xs text-[#666666] hover:text-black underline"
                >
                  View Kit Details Page →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
