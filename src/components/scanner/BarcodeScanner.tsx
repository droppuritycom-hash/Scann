'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertCircle, Volume2, VolumeX, Keyboard } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isProcessing?: boolean;
  placeholderText?: string;
  expectedType?: 'batch' | 'kit' | 'serial';
}

export default function BarcodeScanner({
  onScan,
  isProcessing = false,
  placeholderText = 'Align QR code within the frame',
  expectedType,
}: BarcodeScannerProps) {
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualInput, setManualInput] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scanLockRef = useRef<boolean>(false);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Synthesize crisp warehouse beep
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio autoplay policy fallback
    }
  }, [soundEnabled]);

  const handleSuccessfulScan = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      const cleaned = decodedText.trim();

      // Debounce: ignore same code within 1500ms or if locked
      if (scanLockRef.current || isProcessing) return;
      if (cleaned === lastScannedCodeRef.current && now - lastScanTimeRef.current < 1500) {
        return;
      }

      scanLockRef.current = true;
      lastScannedCodeRef.current = cleaned;
      lastScanTimeRef.current = now;

      // Haptic and audio feedback
      playBeep();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(80);
      }

      onScan(cleaned);

      // Release lock after small delay
      setTimeout(() => {
        scanLockRef.current = false;
      }, 1000);
    },
    [isProcessing, onScan, playBeep]
  );

  const startScanner = useCallback(async () => {
    setCameraError(null);
    const elementId = 'qr-reader-container';

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
      }

      const qrCode = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = qrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await qrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Scan failure frame - silent
        }
      );

      setIsScanning(true);
      setHasCamera(true);
    } catch (err) {
      console.warn('[Scanner] Camera start failed:', err);
      setIsScanning(false);
      setCameraError(
        'Camera access unavailable or permission denied. You can still enter or paste QR codes manually below.'
      );
      setHasCamera(false);
    }
  }, [facingMode, handleSuccessfulScan]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {
        // ignore
      }
      setIsScanning(false);
    }
  }, [isScanning]);

  useEffect(() => {
    startScanner();
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [startScanner]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleSuccessfulScan(manualInput);
    setManualInput('');
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Scanner Viewfinder Box */}
      <div className="relative w-full aspect-square bg-[#111111] overflow-hidden rounded-md border border-[#E5E5E5] flex items-center justify-center">
        {/* Scanner Container Element */}
        <div id="qr-reader-container" className="w-full h-full" />

        {/* Viewfinder Target Frame Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/80 relative rounded-sm">
            {/* Corner Indicators */}
            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-white" />
            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-white" />
            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-white" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-white" />

            {/* Scanning beam animation */}
            {isScanning && !isProcessing && (
              <div className="absolute left-2 right-2 h-0.5 bg-white shadow-[0_0_8px_#ffffff] animate-pulse top-1/2 -translate-y-1/2" />
            )}
          </div>
        </div>

        {/* Overlay when processing */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white z-20">
            <RefreshCw className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm font-semibold tracking-wide">Processing QR Code...</p>
          </div>
        )}

        {/* Camera Error / Fallback State */}
        {cameraError && (
          <div className="absolute inset-0 bg-white p-6 flex flex-col items-center justify-center text-center z-10">
            <AlertCircle className="w-10 h-10 text-[#111111] mb-2" />
            <h4 className="font-bold text-[#111111] text-base mb-1">Camera Inactive</h4>
            <p className="text-xs text-[#666666] mb-4">{cameraError}</p>
            <button
              onClick={startScanner}
              type="button"
              className="px-4 py-2 bg-black text-white text-xs font-semibold rounded hover:bg-neutral-800 transition"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* Viewfinder Controls & Guide */}
      <div className="w-full flex items-center justify-between mt-3 text-xs text-[#666666]">
        <span className="truncate pr-2">{placeholderText}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Mute beep' : 'Enable beep'}
            className="p-1.5 border border-[#E5E5E5] rounded hover:bg-neutral-100 transition text-[#111111]"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {hasCamera && (
            <button
              type="button"
              onClick={toggleCamera}
              title="Flip camera"
              className="p-1.5 border border-[#E5E5E5] rounded hover:bg-neutral-100 transition text-[#111111]"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Manual Input / Hardware Scanner Gun Input Form */}
      <form onSubmit={handleManualSubmit} className="w-full mt-4">
        <label className="block text-xs font-semibold text-[#111111] mb-1">
          Barcode Gun or Manual Entry
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={
                expectedType === 'batch'
                  ? 'e.g. BAT-A00001'
                  : expectedType === 'kit'
                  ? 'e.g. KIT-A00001'
                  : 'e.g. A00001'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!manualInput.trim() || isProcessing}
            className="px-4 py-2 bg-black text-white text-xs font-semibold rounded hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Submit
          </button>
        </div>
        <p className="text-[11px] text-[#888888] mt-1">
          Supports handheld Bluetooth / USB barcode scanners in keyboard mode.
        </p>
      </form>
    </div>
  );
}
