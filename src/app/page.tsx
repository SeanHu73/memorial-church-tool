'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { seedPins } from '@/lib/seed-pins';
import { Pin } from '@/lib/types';
import InquirySheet from '@/components/InquirySheet';
import AskSheet from '@/components/AskSheet';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function Home() {
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [askQuestion, setAskQuestion] = useState<string | null>(null);
  const [bottomBarQ, setBottomBarQ] = useState('');

  const handlePinSelect = useCallback((pin: Pin) => {
    setSelectedPin(pin);
    setAskQuestion(null);
  }, []);

  const handleNavigateToPin = useCallback((pinId: string) => {
    const pin = seedPins.find((p) => p.id === pinId);
    if (pin) setSelectedPin(pin);
  }, []);

  const handleAskQuestion = useCallback((question: string) => {
    setSelectedPin(null);
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
          pins={seedPins}
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
          onClose={() => setSelectedPin(null)}
          onNavigateToPin={handleNavigateToPin}
          onAskQuestion={handleAskQuestion}
        />
      )}

      {/* Ask sheet */}
      {askQuestion !== null && (
        <AskSheet
          initialQuestion={askQuestion || undefined}
          onClose={() => setAskQuestion(null)}
        />
      )}
    </div>
  );
}
