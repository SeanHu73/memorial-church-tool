'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { seedPins } from '@/lib/seed-pins';
import { getPins } from '@/lib/pins-store';
import { getTours } from '@/lib/tours-store';
import { Pin, Tour, Stop } from '@/lib/types';
import { TourProvider, useTour } from '@/context/TourContext';
import type { TourStopMarkerData } from '@/components/Map';
import InquirySheet from '@/components/InquirySheet';
import AskSheet from '@/components/AskSheet';
import JournalPeek from '@/components/tour/JournalPeek';
import Journal from '@/components/tour/Journal';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

function HomeInner() {
  // ── V1 pin state ──
  const [pins, setPins] = useState<Pin[]>(seedPins);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [askQuestion, setAskQuestion] = useState<string | null>(null);
  const [bottomBarQ, setBottomBarQ] = useState('');

  const selectedPin = selectedPinId ? pins.find((p) => p.id === selectedPinId) ?? null : null;

  // ── Tour state ──
  const [tours, setTours] = useState<Tour[]>([]);
  const [peekTour, setPeekTour] = useState<Tour | null>(null);
  const { tour: activeTour, session, isActive, startTour } = useTour();

  // Load pins + tours
  useEffect(() => {
    getPins().then(setPins).catch((err) => {
      console.error('[page] getPins failed, falling back to seed pins:', err);
    });
    getTours().then(setTours).catch((err) => {
      console.error('[page] getTours failed:', err);
    });
  }, []);

  // Build tour stop markers for the map
  const tourStopMarkers: TourStopMarkerData[] = [];
  for (const t of tours) {
    for (let i = 0; i < t.stops.length; i++) {
      const stop = t.stops[i];
      if (!stop.location) continue;
      tourStopMarkers.push({
        stop,
        index: i,
        isActive: isActive && activeTour?.id === t.id && session?.currentStopIndex === i,
        isCompleted: session?.completedStops.includes(stop.id) ?? false,
      });
    }
  }

  // ── Handlers ──
  const handlePinSelect = useCallback((pin: Pin) => {
    setSelectedPinId(pin.id);
    setAskQuestion(null);
    setPeekTour(null);
  }, []);

  const handleNavigateToPin = useCallback((pinId: string) => {
    setSelectedPinId(pinId);
  }, []);

  const handleAskQuestion = useCallback((question: string) => {
    setSelectedPinId(null);
    setAskQuestion(question);
  }, []);

  const handleTourStopSelect = useCallback((stop: Stop) => {
    // If a tour is already active, ignore map taps
    if (isActive) return;
    // Find which tour owns this stop
    const ownerTour = tours.find((t) => t.stops.some((s) => s.id === stop.id));
    if (ownerTour) {
      setPeekTour(ownerTour);
      setSelectedPinId(null);
      setAskQuestion(null);
    }
  }, [tours, isActive]);

  const handleBeginTour = useCallback(() => {
    if (peekTour) {
      startTour(peekTour);
      setPeekTour(null);
    }
  }, [peekTour, startTour]);

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
          tourStops={tourStopMarkers}
          onTourStopSelect={handleTourStopSelect}
          hidePins={isActive}
        />
      </div>

      {/* Bottom bar — hidden during active tour */}
      {!isActive && (
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
      )}

      {/* V1 Inquiry sheet */}
      {selectedPin && !isActive && (
        <InquirySheet
          pin={selectedPin}
          onClose={() => setSelectedPinId(null)}
          onNavigateToPin={handleNavigateToPin}
          onAskQuestion={handleAskQuestion}
        />
      )}

      {/* V1 Ask sheet */}
      {askQuestion !== null && !isActive && (
        <AskSheet
          initialQuestion={askQuestion || undefined}
          onClose={() => setAskQuestion(null)}
          onNavigateToPin={(pinId) => {
            setAskQuestion(null);
            handleNavigateToPin(pinId);
          }}
        />
      )}

      {/* Tour journal peek — before tour starts */}
      {peekTour && !isActive && (
        <JournalPeek
          tour={peekTour}
          onBegin={handleBeginTour}
          onDismiss={() => setPeekTour(null)}
        />
      )}

      {/* Tour journal — active tour playback */}
      {isActive && <Journal />}
    </div>
  );
}

export default function Home() {
  return (
    <TourProvider>
      <HomeInner />
    </TourProvider>
  );
}
