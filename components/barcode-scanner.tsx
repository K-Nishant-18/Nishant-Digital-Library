'use client';

import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onError: (message: string) => void;
}

let hints: Map<DecodeHintType, any> | undefined;

function getHints() {
  if (!hints) {
    hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
  }
  return hints;
}

export function BarcodeScanner({ onDetected, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(getHints(), 350);
    let stopped = false;

    reader
      .decodeFromVideoDevice(null, videoRef.current!, (result) => {
        if (stopped || !result) return;
        const code = result.getText().replace(/[\s-]/g, '');
        // ISBN-13 / ISBN-10 / UPC-A
        if (/^\d{13}$/.test(code) || /^\d{9}[\dxX]$/.test(code) || /^\d{12}$/.test(code)) {
          stopped = true;
          onDetectedRef.current(code);
        }
      })
      .catch((err) => {
        if (stopped) return;
        console.error('[barcode-scanner]', err);
        onError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission denied — allow camera access to scan'
            : 'Could not start camera. Type the ISBN instead.'
        );
      });

    return () => {
      stopped = true;
      try { reader.reset(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        autoPlay
        playsInline
      />
      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-10 border-2 border-amber-400/80 rounded-md pointer-events-none" />
      <span className="absolute bottom-2 inset-x-0 text-center text-[10px] text-slate-300 font-medium">
        Hold the book barcode steady in the frame
      </span>
    </div>
  );
}
