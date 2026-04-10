'use client';

import { useEffect, useRef, useCallback } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { warmMapStyles } from '@/lib/map-styles';
import { Pin } from '@/lib/types';

const MEMORIAL_CHURCH = { lat: 37.42700, lng: -122.17015 };

interface MapProps {
  pins: Pin[];
  selectedPinId: string | null;
  onPinSelect: (pin: Pin) => void;
}

export default function Map({ pins, selectedPinId, onPinSelect }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const buildMarkerEl = useCallback((isSelected: boolean) => {
    const size = isSelected ? 42 : 34;
    const dot = isSelected ? 14 : 10;
    const el = document.createElement('div');
    el.style.cssText = `
      width:${size}px;height:${size}px;border-radius:50%;
      background:${isSelected ? '#1B3A5C' : '#B8943E'};
      border:3px solid ${isSelected ? '#D4AD52' : '#F5F0E8'};
      box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all .25s ease;
    `;
    const inner = document.createElement('div');
    inner.style.cssText = `width:${dot}px;height:${dot}px;border-radius:50%;background:${isSelected ? '#D4AD52' : '#F5F0E8'};`;
    el.appendChild(inner);
    return el;
  }, []);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !containerRef.current) return;

    setOptions({ key: apiKey, v: 'weekly' });

    importLibrary('maps').then(async () => {
      await importLibrary('marker');

      const map = new google.maps.Map(containerRef.current!, {
        center: MEMORIAL_CHURCH,
        zoom: 19,
        styles: warmMapStyles,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        gestureHandling: 'greedy',
        mapId: 'memorial-church-warm',
      });
      mapRef.current = map;

      pins.forEach((pin) => {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: pin.location.lat, lng: pin.location.lng },
          content: buildMarkerEl(pin.id === selectedPinId),
          title: pin.title,
        });
        marker.addListener('click', () => onPinSelect(pin));
        markersRef.current.push(marker);
      });
    });

    return () => {
      markersRef.current.forEach((m) => { m.map = null; });
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers on selection change
  useEffect(() => {
    markersRef.current.forEach((marker, i) => {
      if (pins[i]) marker.content = buildMarkerEl(pins[i].id === selectedPinId);
    });
  }, [selectedPinId, pins, buildMarkerEl]);

  return <div ref={containerRef} className="w-full h-full" />;
}
