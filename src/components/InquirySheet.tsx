'use client';

import { useState, useRef, useEffect } from 'react';
import { Pin } from '@/lib/types';

interface Props {
  pin: Pin;
  onClose: () => void;
  onNavigateToPin: (pinId: string) => void;
  onAskQuestion: (question: string) => void;
}

export default function InquirySheet({ pin, onClose, onNavigateToPin, onAskQuestion }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [ownQ, setOwnQ] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRevealed(false);
    scrollRef.current?.scrollTo(0, 0);
  }, [pin.id]);

  const close = () => { setClosing(true); setTimeout(onClose, 300); };

  const reveal = () => {
    setRevealed(true);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 80);
  };

  const submitOwn = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownQ.trim()) { onAskQuestion(ownQ.trim()); setOwnQ(''); }
  };

  const areaLabel = pin.location.physicalArea.replace(/_/g, ' ');

  return (
    <div className="absolute inset-x-0 bottom-0 z-20" style={{ height: '78%' }}>
      {/* backdrop tap to close */}
      <div className="absolute inset-0 -top-[30vh]" onClick={close} />

      <div
        className={`relative h-full bg-cream rounded-t-3xl flex flex-col texture-linen ${closing ? 'animate-slide-down' : 'animate-slide-up'}`}
        style={{ boxShadow: '0 -4px 30px rgba(44,36,25,.15)' }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-sandstone-light" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-aged-gold inline-block" />
            <span className="text-[11px] font-sans font-medium text-text-muted uppercase tracking-wider">{areaLabel}</span>
          </div>
          <button onClick={close} className="text-text-muted hover:text-text-secondary p-1" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* scrollable body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto inquiry-scroll px-5 pb-8">
          {!revealed ? (
            /* ── QUESTION STATE ── */
            <div className="animate-fade-in">
              <h2 className="font-serif text-lg font-bold text-text-primary mb-4 leading-snug">{pin.title}</h2>

              <p className="font-serif text-[1.2rem] leading-relaxed text-mosaic-blue mb-5">
                {pin.inquiry.question}
              </p>

              {/* photo placeholder */}
              <div className="rounded-xl overflow-hidden mb-5 border border-sandstone-light/30 bg-cream-dark">
                <div className="w-full aspect-[4/3] flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#EBE3D6,#D4BFA0)' }}>
                  <div className="text-center px-6">
                    <svg className="mx-auto mb-1.5 text-sandstone" width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8" cy="9" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 16l5-5 5 5 4-4 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-[11px] text-text-muted font-sans">Photo coming soon</p>
                  </div>
                </div>
                <p className="px-4 py-2.5 text-xs text-text-secondary font-sans leading-relaxed">{pin.photo.caption}</p>
              </div>

              <button
                onClick={reveal}
                className="w-full py-4 rounded-xl bg-mosaic-blue text-cream font-sans font-medium text-[15px] hover:bg-mosaic-blue-light active:scale-[.98] transition-all"
              >
                We&apos;ve discussed it — show us more
              </button>
            </div>
          ) : (
            /* ── ANSWER STATE ── */
            <div className="animate-fade-in">
              <p className="font-serif text-sm text-text-muted italic mb-3 leading-relaxed">{pin.inquiry.question}</p>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-sandstone-light/50" />
                <span className="text-aged-gold text-xs">&#10022;</span>
                <div className="flex-1 h-px bg-sandstone-light/50" />
              </div>

              <p className="font-serif text-[1.05rem] leading-[1.8] text-text-primary mb-6">
                {pin.inquiry.answer}
              </p>

              {/* suggested next */}
              {pin.inquiry.suggestedNext && (
                <button
                  onClick={() => onNavigateToPin(pin.inquiry.suggestedNext!.pinId)}
                  className="w-full text-left p-4 rounded-xl border border-sandstone-light/50 bg-warm-white hover:border-aged-gold/50 hover:bg-cream transition-all group mb-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-aged-gold mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                    <p className="font-serif text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">{pin.inquiry.suggestedNext.teaser}</p>
                  </div>
                </button>
              )}

              {/* own question */}
              <div className="pt-2">
                <p className="text-[11px] text-text-muted font-sans mb-2 uppercase tracking-wider">What are you curious about now?</p>
                <form onSubmit={submitOwn} className="flex gap-2">
                  <input
                    value={ownQ}
                    onChange={(e) => setOwnQ(e.target.value)}
                    placeholder="Ask about what you see..."
                    className="flex-1 px-4 py-3 rounded-xl bg-warm-white border border-sandstone-light/50 text-sm font-sans text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-mosaic-blue/30 focus:ring-1 focus:ring-mosaic-blue/20 transition-all"
                  />
                  <button type="submit" disabled={!ownQ.trim()} className="px-4 py-3 rounded-xl bg-mosaic-blue text-cream text-sm font-sans font-medium disabled:opacity-40 hover:bg-mosaic-blue-light active:scale-[.98] transition-all">
                    Ask
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
