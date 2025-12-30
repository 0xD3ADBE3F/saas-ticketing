"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onResume?: () => void;
  isActive: boolean;
}

export function QRScanner({
  onScan,
  onError,
  onResume,
  isActive,
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastScanRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Use refs for callbacks to avoid effect re-runs
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  // Debounced scan handler
  const handleScan = useCallback((decodedText: string) => {
    const now = Date.now();
    if (
      decodedText === lastScanRef.current &&
      now - lastScanTimeRef.current < 2000
    ) {
      return;
    }
    lastScanRef.current = decodedText;
    lastScanTimeRef.current = now;
    onScanRef.current(decodedText);
  }, []);

  // Initialize scanner once on mount
  useEffect(() => {
    mountedRef.current = true;
    const scannerId = "qr-reader";

    const initScanner = async () => {
      // Prevent multiple concurrent initializations
      if (initializingRef.current || scannerRef.current) {
        return;
      }
      initializingRef.current = true;

      // Wait for DOM element to be ready
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!mountedRef.current) {
        initializingRef.current = false;
        return;
      }

      const element = document.getElementById(scannerId);
      if (!element) {
        console.error("QR reader element not found");
        initializingRef.current = false;
        return;
      }

      try {
        const scanner = new Html5Qrcode(scannerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          handleScan,
          () => {} // Ignore decode errors
        );

        if (mountedRef.current) {
          setHasPermission(true);
          setIsScanning(true);
          setErrorMessage(null);
        }
      } catch (err) {
        console.error("Scanner init error:", err);

        if (!mountedRef.current) {
          initializingRef.current = false;
          return;
        }

        const errorStr = String(err);
        let message =
          "Kon camera niet starten. Probeer de pagina te verversen.";

        if (
          errorStr.includes("NotAllowedError") ||
          errorStr.includes("Permission")
        ) {
          message =
            "Camera toegang geweigerd. Sta toegang toe in je browser instellingen.";
        } else if (
          errorStr.includes("NotFoundError") ||
          errorStr.includes("no camera")
        ) {
          message = "Geen camera gevonden op dit apparaat.";
        } else if (
          errorStr.includes("NotReadableError") ||
          errorStr.includes("in use")
        ) {
          message = "Camera is in gebruik door een andere app.";
        } else if (errorStr.includes("transition")) {
          // Transition error - scanner might still be initializing, ignore
          initializingRef.current = false;
          return;
        }

        setHasPermission(false);
        setErrorMessage(message);
        onErrorRef.current?.(message);
      } finally {
        initializingRef.current = false;
      }
    };

    initScanner();

    // Cleanup on unmount only
    return () => {
      mountedRef.current = false;

      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;

        // Clear element content first
        const element = document.getElementById(scannerId);
        if (element) {
          element.innerHTML = "";
        }

        if (scanner.isScanning) {
          scanner.stop().catch(() => {});
        }
      }
    };
  }, [handleScan]); // Only handleScan which is stable

  // Handle isActive changes - use pause/resume with fallback
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || hasPermission !== true) return;

    const handleActiveChange = async () => {
      // Get scanner state - values: NOT_STARTED, SCANNING, PAUSED
      const state = scanner.getState();
      console.log("Scanner state:", state, "isActive:", isActive);

      if (!isActive) {
        // Pause scanning if currently scanning
        if (state === 2) {
          // Html5QrcodeScannerState.SCANNING = 2
          try {
            scanner.pause(true);
            setIsScanning(false);
          } catch (e) {
            console.error("Pause error:", e);
          }
        }
      } else {
        // Resume scanning
        if (state === 3) {
          // Html5QrcodeScannerState.PAUSED = 3
          try {
            scanner.resume();
            setIsScanning(true);
          } catch (e) {
            console.error("Resume error:", e);
            // Resume failed, try restarting the scanner
            try {
              await scanner.start(
                { facingMode: "environment" },
                {
                  fps: 10,
                  qrbox: { width: 250, height: 250 },
                  aspectRatio: 1,
                },
                handleScan,
                () => {}
              );
              setIsScanning(true);
            } catch (startErr) {
              console.error("Failed to restart scanner:", startErr);
            }
          }
        } else if (state === 1) {
          // Html5QrcodeScannerState.NOT_STARTED = 1
          // Scanner was stopped, need to start it
          try {
            await scanner.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1,
              },
              handleScan,
              () => {}
            );
            setIsScanning(true);
          } catch (startErr) {
            console.error("Failed to start scanner:", startErr);
          }
        }
      }
    };

    handleActiveChange();
  }, [isActive, hasPermission, handleScan]);

  // Permission denied or error
  if (hasPermission === false) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-4">📷</div>
        <h3 className="font-semibold text-lg mb-2">Camera Toegang Vereist</h3>
        <p className="text-gray-400 text-sm mb-4">
          {errorMessage || "Sta camera toegang toe om QR codes te scannen."}
        </p>
        <button
          onClick={() => {
            setHasPermission(null);
            setErrorMessage(null);
            window.location.reload();
          }}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  // Always render the qr-reader element so the scanner can initialize
  return (
    <div className="relative">
      {/* Scanner Container */}
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <div
          id="qr-reader"
          className={`w-full aspect-square ${!isScanning ? "opacity-50" : ""}`}
        />

        {/* Loading overlay */}
        {hasPermission === null && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl animate-pulse mb-4">📷</div>
              <p className="text-gray-400">Camera initialiseren...</p>
            </div>
          </div>
        )}

        {/* Scanner Frame Overlay */}
        {hasPermission && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 relative">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

              {/* Scanning line animation */}
              {isScanning && (
                <div className="absolute left-4 right-4 h-0.5 bg-blue-500 animate-scan" />
              )}
            </div>
          </div>
        )}

        {/* Paused overlay - clickable to resume */}
        {hasPermission && !isScanning && onResume && (
          <button
            onClick={onResume}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer hover:bg-black/50 transition-colors"
          >
            <div className="text-5xl mb-3">▶️</div>
            <p className="text-white text-lg font-medium">Gepauzeerd</p>
            <p className="text-gray-300 text-sm mt-1">Tik om te hervatten</p>
          </button>
        )}
      </div>

      {/* Status */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-400">
          {isScanning
            ? "Richt de camera op een QR code"
            : hasPermission
              ? "Scanner gepauzeerd"
              : "Scanner opstarten..."}
        </p>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          50% {
            top: calc(100% - 2px);
          }
          100% {
            top: 0;
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
