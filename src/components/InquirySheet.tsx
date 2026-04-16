'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Pin, Photo, SessionMemory } from '@/lib/types';
import {
  loadSessionMemory,
  saveSessionMemory,
  recordTurn,
  isZoomOutAvailable,
  addOpenZoomOutQuestion,
} from '@/lib/session-memory';
import { selectPhotoForResponse } from '@/lib/photo-matcher';
import { getPhotos } from '@/lib/photos-store';
import { classifyQuestion } from '@/lib/hint-matcher';
import PhotoDisplay from './PhotoDisplay';

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
  const [deepenQ, setDeepenQ] = useState<string | null>(null);
  const [deepenMode, setDeepenMode] = useState<'deepen' | 'zoom_out'>('deepen');
  const [deepenLoading, setDeepenLoading] = useState(false);
  const [deepenPhase, setDeepenPhase] = useState<'idle' | 'question' | 'loading' | 'observe' | 'answer'>('idle');
  const [deepenEntriesUsed, setDeepenEntriesUsed] = useState<string[]>([]);
  const [contributionText, setContributionText] = useState('');
  const [contributionSent, setContributionSent] = useState(false);
  const [sessionMemory, setSessionMemory] = useState<SessionMemory>(() => loadSessionMemory());
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pull the full photo library on mount. The matcher operates on the
  // entire library (library-first retrieval) — pin attachment is only
  // a tiebreaker, never a filter. Failures leave allPhotos empty, in
  // which case the matcher returns null and no photo renders.
  useEffect(() => {
    getPhotos().then(setAllPhotos).catch(() => {});
  }, []);

  // Reset per-pin UI state. We do NOT clear sessionMemory here — that
  // persists across pins for the duration of the tab.
  useEffect(() => {
    setRevealed(false);
    setDeepenPhase('idle');
    setDeepenQ(null);
    setDeepenMode('deepen');
    setDeepenEntriesUsed([]);
    setContributionSent(false);
    scrollRef.current?.scrollTo(0, 0);
  }, [pin.id]);

  // Keep sessionMemory in localStorage in lockstep with React state.
  useEffect(() => {
    saveSessionMemory(sessionMemory);
  }, [sessionMemory]);

  const offerZoomOut = useMemo(() => isZoomOutAvailable(sessionMemory), [sessionMemory]);

  const close = () => { setClosing(true); setTimeout(onClose, 300); };

  const photoCategories = useMemo(() => classifyQuestion(pin.inquiry.question), [pin.inquiry.question]);

  const photoSelection = useMemo(
    () =>
      selectPhotoForResponse({
        photos: allPhotos,
        observation: null,             // static inquiry has no dedicated observation text
        answer: pin.inquiry.answer,
        anchorUsed: pin.inquiry.question,
        observationEntries: pin.databaseEntryIds,
        answerEntries: pin.databaseEntryIds,
        questionCategory: photoCategories[0] ?? null,
        currentLocation: pin.location.physicalArea,
        currentPin: pin,
      }),
    [allPhotos, pin, photoCategories]
  );

  const reveal = () => {
    setRevealed(true);
    // Static (non-AI) inquiry reveal: count it as a substantive turn so the
    // coverage gate progresses even on seed-pin browsing. We pass the pin's
    // categories + entries + area so the model later sees full coverage.
    setSessionMemory((prev) =>
      recordTurn(prev, {
        substantive: true,
        category: photoCategories[0] ?? null,
        entriesUsed: pin.databaseEntryIds,
        location: pin.location.physicalArea,
        // No anchor/quotation tracking for static inquiries — they're
        // pre-authored and don't risk recycling against AI output.
      })
    );
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 80);
  };

  const submitOwn = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownQ.trim()) { onAskQuestion(ownQ.trim()); setOwnQ(''); }
  };

  const handleDeepenOrZoom = async (kind: 'deepen' | 'zoom_out') => {
    setDeepenLoading(true);
    setDeepenMode(kind);
    setDeepenPhase('loading');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: kind,
          mode: kind,
          pinContext: `${pin.title} (${pin.location.physicalArea.replace(/_/g, ' ')})`,
          sessionMemory,
        }),
      });
      const data = await res.json();
      const finalQuestion = data.question || (kind === 'zoom_out'
        ? 'Turn around and look back across the Quad. How does this church fit into the larger story of what the Stanfords built here?'
        : "What details here surprised you the most?");
      const entries = Array.isArray(data.entriesUsed) ? data.entriesUsed : [];

      setDeepenQ(finalQuestion);
      setDeepenEntriesUsed(entries);
      setDeepenPhase('question');

      // Record the deepen/zoom turn in memory. Zoom-out questions are
      // additionally tracked in openZoomOutQuestions so we can resurface
      // them later once coverage has grown.
      setSessionMemory((prev) => {
        let next = recordTurn(prev, {
          substantive: true,
          entriesUsed: entries,
          location: kind === 'zoom_out' ? null : pin.location.physicalArea,
        });
        if (kind === 'zoom_out') {
          next = addOpenZoomOutQuestion(next, {
            question: finalQuestion,
            requiredCoverage: entries,
            turnAsked: next.substantiveTurnCount,
          });
        }
        return next;
      });
    } catch {
      setDeepenQ(kind === 'zoom_out'
        ? 'Step back and look at the whole building. What would be missing from this campus if the church weren\'t here?'
        : "What do you notice here that you didn't expect? Talk about it together.");
      setDeepenEntriesUsed([]);
      setDeepenPhase('question');
    }
    setDeepenLoading(false);
  };

  const submitContribution = async () => {
    if (!contributionText.trim()) return;
    try {
      await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pinId: pin.id,
          question: deepenQ || pin.inquiry.question,
          contribution: contributionText.trim(),
        }),
      });
    } catch {
      // Silent failure — contribution logging shouldn't block the experience
    }
    setContributionSent(true);
    setContributionText('');
  };

  const areaLabel = pin.location.physicalArea.replace(/_/g, ' ');

  // Deepen / zoom-out photo — matched against the AI-generated question's entriesUsed.
  // Deepen/zoom responses are single questions; the answer slot already
  // does the heavy lifting via the visible/invisible heuristic, so we
  // pass the question text as both the anchor and the answer signal.
  const deepenPhoto = useMemo(() => {
    if (!deepenQ) return null;
    const cats = classifyQuestion(deepenQ);
    const sel = selectPhotoForResponse({
      photos: allPhotos,
      observation: null,
      answer: deepenQ,
      anchorUsed: deepenQ,
      observationEntries: [],
      answerEntries: deepenEntriesUsed,
      questionCategory: cats[0] ?? null,
      currentLocation: deepenMode === 'zoom_out' ? null : pin.location.physicalArea,
      currentPin: deepenMode === 'zoom_out' ? null : pin,
    });
    return sel.answerPhoto || sel.observationPhoto;
  }, [deepenQ, deepenEntriesUsed, deepenMode, allPhotos, pin]);

  // Check if an answer looks like an "I don't know" response
  const isIDontKnow = (text: string) => {
    const lower = text.toLowerCase();
    return lower.includes("i don't have specific information") ||
           lower.includes("i don't have much on that") ||
           lower.includes("i don't know") ||
           lower.includes("beyond my knowledge") ||
           lower.includes("not in my knowledge");
  };

  const renderThreeOptions = (showContributeOption?: boolean) => (
    <div className="space-y-3 mt-6 animate-fade-in">
      <p className="text-[11px] text-text-muted font-sans uppercase tracking-wider mb-2">What next?</p>

      {/* Option 1: See something connected */}
      {pin.inquiry.suggestedNext && (
        <button
          onClick={() => onNavigateToPin(pin.inquiry.suggestedNext!.pinId)}
          className="w-full text-left p-4 rounded-xl border border-sandstone-light/50 bg-warm-white hover:border-aged-gold/50 hover:bg-cream transition-all group"
        >
          <div className="flex items-start gap-3">
            <span className="text-aged-gold mt-0.5 shrink-0 text-lg group-hover:translate-x-0.5 transition-transform">→</span>
            <div>
              <p className="text-xs font-sans font-medium text-text-muted mb-1 uppercase tracking-wider">See something connected</p>
              <p className="font-serif text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">{pin.inquiry.suggestedNext.teaser}</p>
            </div>
          </div>
        </button>
      )}

      {/* Option 2: Keep talking OR Step back — coverage-gated */}
      {offerZoomOut ? (
        <button
          onClick={() => handleDeepenOrZoom('zoom_out')}
          disabled={deepenLoading}
          className="w-full text-left p-4 rounded-xl border border-mosaic-teal/40 bg-warm-white hover:border-mosaic-teal/70 hover:bg-cream transition-all group"
        >
          <div className="flex items-start gap-3">
            {/* Horizon / compass rose icon */}
            <span className="text-mosaic-teal mt-0.5 shrink-0 text-lg">🧭</span>
            <div>
              <p className="text-xs font-sans font-medium text-text-muted mb-1 uppercase tracking-wider">Step back and see the bigger picture</p>
              <p className="font-serif text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">Widen the frame — how does this connect to the rest of the campus, the era, the larger story?</p>
            </div>
          </div>
        </button>
      ) : (
        <button
          onClick={() => handleDeepenOrZoom('deepen')}
          disabled={deepenLoading}
          className="w-full text-left p-4 rounded-xl border border-sandstone-light/50 bg-warm-white hover:border-mosaic-blue/30 hover:bg-cream transition-all group"
        >
          <div className="flex items-start gap-3">
            <span className="text-mosaic-blue mt-0.5 shrink-0 text-lg">💬</span>
            <div>
              <p className="text-xs font-sans font-medium text-text-muted mb-1 uppercase tracking-wider">Keep talking about this</p>
              <p className="font-serif text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">Get a question to discuss together right here</p>
            </div>
          </div>
        </button>
      )}

      {/* Option 3: Ask your own question */}
      <div className="p-4 rounded-xl border border-sandstone-light/50 bg-warm-white">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-mosaic-teal mt-0.5 shrink-0 text-lg">✦</span>
          <p className="text-xs font-sans font-medium text-text-muted uppercase tracking-wider">Ask your own question</p>
        </div>
        <form onSubmit={submitOwn} className="flex gap-2">
          <input
            value={ownQ}
            onChange={(e) => setOwnQ(e.target.value)}
            placeholder="What are you curious about?"
            className="flex-1 px-4 py-3 rounded-xl bg-cream border border-sandstone-light/50 text-sm font-sans text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-mosaic-blue/30 focus:ring-1 focus:ring-mosaic-blue/20 transition-all"
          />
          <button type="submit" disabled={!ownQ.trim()} className="px-4 py-3 rounded-xl bg-mosaic-blue text-cream text-sm font-sans font-medium disabled:opacity-40 hover:bg-mosaic-blue-light active:scale-[.98] transition-all">
            Ask
          </button>
        </form>
      </div>

      {/* Contribution option — only when the model said "I don't know" */}
      {showContributeOption && !contributionSent && (
        <div className="p-4 rounded-xl border border-aged-gold/30 bg-warm-white">
          <div className="flex items-start gap-3 mb-2">
            <span className="text-aged-gold mt-0.5 shrink-0 text-lg">✍</span>
            <div>
              <p className="text-xs font-sans font-medium text-text-muted mb-1 uppercase tracking-wider">Share what you found</p>
              <p className="font-serif text-xs text-text-secondary leading-relaxed">If you discovered something, add it here. Your contribution helps the knowledge base grow.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={contributionText}
              onChange={(e) => setContributionText(e.target.value)}
              placeholder="What did you find out?"
              className="flex-1 px-4 py-3 rounded-xl bg-cream border border-sandstone-light/50 text-sm font-sans text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-aged-gold/30 focus:ring-1 focus:ring-aged-gold/20 transition-all"
            />
            <button
              onClick={submitContribution}
              disabled={!contributionText.trim()}
              className="px-4 py-3 rounded-xl bg-aged-gold text-warm-white text-sm font-sans font-medium disabled:opacity-40 hover:bg-aged-gold-light active:scale-[.98] transition-all"
            >
              Share
            </button>
          </div>
        </div>
      )}

      {contributionSent && (
        <div className="p-4 rounded-xl border border-mosaic-teal/30 bg-warm-white animate-fade-in">
          <p className="font-serif text-sm text-mosaic-teal leading-relaxed">Thank you — your contribution has been saved for review.</p>
        </div>
      )}
    </div>
  );

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

              {/* Observation-slot photo: what the learner is being asked to look at */}
              {photoSelection.observationPhoto && (
                <PhotoDisplay photo={photoSelection.observationPhoto} categories={photoCategories} />
              )}

              <button
                onClick={reveal}
                className="w-full py-4 rounded-xl bg-mosaic-blue text-cream font-sans font-medium text-[15px] hover:bg-mosaic-blue-light active:scale-[.98] transition-all"
              >
                We&apos;ve discussed it — show us more
              </button>
            </div>
          ) : deepenPhase === 'idle' ? (
            /* ── ANSWER STATE with three options ── */
            <div className="animate-fade-in">
              <p className="font-serif text-sm text-text-muted italic mb-3 leading-relaxed">{pin.inquiry.question}</p>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-sandstone-light/50" />
                <span className="text-aged-gold text-xs">&#10022;</span>
                <div className="flex-1 h-px bg-sandstone-light/50" />
              </div>

              <p className="font-serif text-[1.05rem] leading-[1.8] text-text-primary mb-2">
                {pin.inquiry.answer}
              </p>

              {/* Answer-slot photo: archival / historical context for the narrative.
                  If it's the same photo as the observation slot, skip it — already shown. */}
              {photoSelection.answerPhoto &&
                photoSelection.answerPhoto !== photoSelection.observationPhoto && (
                  <PhotoDisplay photo={photoSelection.answerPhoto} categories={photoCategories} />
                )}

              {renderThreeOptions(isIDontKnow(pin.inquiry.answer))}
            </div>
          ) : deepenPhase === 'loading' ? (
            /* ── DEEPEN/ZOOM LOADING ── */
            <div className="animate-fade-in">
              <p className="font-serif text-sm text-text-muted italic mb-4 leading-relaxed">
                {deepenMode === 'zoom_out' ? 'Widening the frame...' : 'Thinking of something to discuss...'}
              </p>
              <div className="flex items-center gap-3 py-6">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="w-2 h-2 rounded-full bg-sandstone animate-pulse" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          ) : deepenPhase === 'question' ? (
            /* ── DEEPEN/ZOOM QUESTION ── */
            <div className="animate-fade-in">
              <div className={`rounded-xl border p-5 mb-5 ${deepenMode === 'zoom_out' ? 'border-mosaic-teal/30' : 'border-mosaic-blue/20'} bg-warm-white`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className={`text-lg mt-0.5 shrink-0 ${deepenMode === 'zoom_out' ? 'text-mosaic-teal' : 'text-mosaic-blue'}`}>
                    {deepenMode === 'zoom_out' ? '🧭' : '💬'}
                  </span>
                  <p className="font-serif text-[1.1rem] leading-relaxed text-mosaic-blue">
                    {deepenQ}
                  </p>
                </div>
                <p className="text-xs text-text-muted font-sans">
                  {deepenMode === 'zoom_out'
                    ? 'Step back together. Talk about how this fits into the bigger picture.'
                    : 'Talk it over together. There\'s no right answer.'}
                </p>
              </div>

              {/* Optional photo for zoom-out: if the AI referenced an entry
                  we have a photo for, show that place as a visual anchor. */}
              {deepenPhoto && deepenQ && (
                <PhotoDisplay photo={deepenPhoto} categories={classifyQuestion(deepenQ)} />
              )}

              {renderThreeOptions()}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
