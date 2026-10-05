'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle, Volume2, VolumeX } from 'lucide-react';
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

  // Stable references to prevent camera unmounts/restarts
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Synthesize warehouse audio beep
  const playBeep = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  const handleSuccessfulScan = useCallback(
    (decodedText: string) => {
      const now = Date.now();
      const cleaned = decodedText.trim();

      // Debounce: ignore same code within 2000ms or if locked/processing
      if (scanLockRef.current || isProcessingRef.current) return;
      if (cleaned === lastScannedCodeRef.current && now - lastScanTimeRef.current < 2000) {
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

      // Call parent without causing camera restart
      onScanRef.current(cleaned);

      // Release lock after short delay for next item
      setTimeout(() => {
        scanLockRef.current = false;
      }, 500);
    },
    [playBeep]
  );

  const startScanner = useCallback(async () => {
    setCameraError(null);
    const elementId = 'qr-reader-container';

    try {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
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
        fps: 20,
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
      console.warn('[Scanner] Camera start error:', err);
      setIsScanning(false);
      setCameraError(
        'Camera access unavailable or permission denied. You can still enter or paste QR codes manually below.'
      );
      setHasCamera(false);
    }
  }, [facingMode, handleSuccessfulScan]);

  useEffect(() => {
    startScanner();
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop();
          }
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
      <div className="relative w-full aspect-square bg-[#111111] overflow-hidden rounded-xl border border-[#E5E5E5] flex items-center justify-center">
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

        {/* Minimal Non-blocking Overlay when processing */}
        {isProcessing && (
          <div className="absolute top-3 right-3 bg-black/80 text-white px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-sm z-20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Saving...</span>
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
        <span className="truncate pr-2 font-medium">{placeholderText}</span>
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
      <form onSubmit={handleManualSubmit} className="w-full mt-3">
        <div className="flex gap-2">
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
            className="flex-1 px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded focus:outline-none focus:border-black font-mono"
          />
          <button
            type="submit"
            disabled={!manualInput.trim() || isProcessing}
            className="px-4 py-2 bg-black text-white text-xs font-semibold rounded hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
