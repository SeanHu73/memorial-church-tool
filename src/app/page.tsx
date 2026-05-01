'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getTours } from '@/lib/tours-store';
import { Tour, Stop } from '@/lib/types';
import { TourProvider, useTour } from '@/context/TourContext';
import type { TourStopMarkerData } from '@/components/Map';
import JournalPeek from '@/components/tour/JournalPeek';
import Journal from '@/components/tour/Journal';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

function HomeInner() {
  // ── Tour state ──
  const [tours, setTours] = useState<Tour[]>([]);
  const [peekTour, setPeekTour] = useState<Tour | null>(null);
  const { tour: activeTour, session, isActive, startTour } = useTour();

  useEffect(() => {
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

  const handleTourStopSelect = useCallback((stop: Stop) => {
    if (isActive) return;
    const ownerTour = tours.find((t) => t.stops.some((s) => s.id === stop.id));
    if (ownerTour) {
      setPeekTour(ownerTour);
    }
  }, [tours, isActive]);

  const handleBeginTour = useCallback(() => {
    if (peekTour) {
      startTour(peekTour);
      setPeekTour(null);
    }
  }, [peekTour, startTour]);

  return (
    <div className="relative h-full w-full flex flex-col bg-cream">
      {/* Map */}
      <div className="flex-1 relative">
        <Map
          pins={[]}
          selectedPinId={null}
          onPinSelect={() => {}}
          tourStops={tourStopMarkers}
          onTourStopSelect={handleTourStopSelect}
          hidePins={true}
        />
      </div>

      {/* Bottom bar — branding only, no free-form ask */}
      {!isActive && (
        <div className="shrink-0 bg-cream border-t border-sandstone-light/40 px-4 py-3 z-10">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-serif text-sm font-bold text-text-primary leading-tight">Memorial Church</p>
              <p className="text-[10px] text-text-muted font-sans tracking-wide uppercase">Provenance</p>
            </div>
            {tours.length > 0 && !peekTour && (
              <p className="text-xs text-text-muted ml-auto">
                Tap a pin to begin
              </p>
            )}
          </div>
        </div>
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
