'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { seedPins } from '@/lib/seed-pins';
import { getPins } from '@/lib/pins-store';
import { Pin } from '@/lib/types';
import InquirySheet from '@/components/InquirySheet';
import AskSheet from '@/components/AskSheet';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function Home() {
  // Start with seed pins for instant render; replace with Firestore-merged pins once loaded.
  const [pins, setPins] = useState<Pin[]>(seedPins);
  // CRITICAL: store only the id of the selected pin, not the pin object. If
  // we stored the object, a pin clicked before Firestore loads would be a
  // stale seed-pin reference with empty photos. By storing the id and
  // deriving the pin from the current `pins` array, the InquirySheet gets
  // fresh pin data (with archival photos) as soon as Firestore merges in.
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [askQuestion, setAskQuestion] = useState<string | null>(null);
  const [bottomBarQ, setBottomBarQ] = useState('');

  const selectedPin = selectedPinId ? pins.find((p) => p.id === selectedPinId) ?? null : null;

  useEffect(() => {
    getPins().then(setPins).catch((err) => {
      // Visible in browser devtools. If this fires, Firestore reads are
      // being rejected (most commonly: expired test-mode security rules).
      // Photos won't show because the seed baseline has empty photo arrays.
      console.error('[page] getPins failed, falling back to seed pins (photos will be empty):', err);
    });
  }, []);

  const handlePinSelect = useCallback((pin: Pin) => {
    setSelectedPinId(pin.id);
    setAskQuestion(null);
  }, []);

  const handleNavigateToPin = useCallback((pinId: string) => {
    setSelectedPinId(pinId);
  }, []);

  const handleAskQuestion = useCallback((question: string) => {
    setSelectedPinId(null);
    setAskQuestion(question);
  }, []);

  const handleBottomBarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bottomBarQ.trim()) {
      handleAskQuestion(bottomBarQ.trim());
      setBottomBarQ('');
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-cream">
      {/* Map */}
      <div className="flex-1 relative">
        <Map
          pins={pins}
          selectedPinId={selectedPin?.id ?? null}
          onPinSelect={handlePinSelect}
        />
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 bg-cream border-t border-sandstone-light/40 px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <p className="font-serif text-sm font-bold text-text-primary leading-tight">Memorial Church</p>
            <p className="text-[10px] text-text-muted font-sans tracking-wide uppercase">Provenance</p>
          </div>
          <form onSubmit={handleBottomBarSubmit} className="flex-1 flex gap-2">
            <input
              value={bottomBarQ}
              onChange={(e) => setBottomBarQ(e.target.value)}
              placeholder="Ask your own question..."
              className="flex-1 px-3 py-2 rounded-lg bg-warm-white border border-sandstone-light/40 text-sm font-sans text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-mosaic-blue/30 focus:ring-1 focus:ring-mosaic-blue/20 transition-all"
            />
            <button
              type="submit"
              disabled={!bottomBarQ.trim()}
              className="px-3 py-2 rounded-lg bg-mosaic-blue text-cream text-xs font-sans font-medium disabled:opacity-30 hover:bg-mosaic-blue-light active:scale-[.97] transition-all"
            >
              Ask
            </button>
          </form>
        </div>
      </div>

      {/* Inquiry sheet */}
      {selectedPin && (
        <InquirySheet
          pin={selectedPin}
          onClose={() => setSelectedPinId(null)}
          onNavigateToPin={handleNavigateToPin}
          onAskQuestion={handleAskQuestion}
        />
      )}

      {/* Ask sheet */}
      {askQuestion !== null && (
        <AskSheet
          initialQuestion={askQuestion || undefined}
          onClose={() => setAskQuestion(null)}
          onNavigateToPin={(pinId) => {
            setAskQuestion(null);
            handleNavigateToPin(pinId);
          }}
        />
      )}
    </div>
  );
}
