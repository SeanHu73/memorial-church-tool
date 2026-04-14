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
  const [deepenQ, setDeepenQ] = useState<string | null>(null);
  const [deepenLoading, setDeepenLoading] = useState(false);
  const [deepenAnswer, setDeepenAnswer] = useState<string | null>(null);
  const [deepenObservation, setDeepenObservation] = useState<string | null>(null);
  const [deepenPhase, setDeepenPhase] = useState<'idle' | 'question' | 'loading' | 'observe' | 'answer'>('idle');
  const [contributionText, setContributionText] = useState('');
  const [contributionSent, setContributionSent] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRevealed(false);
    setDeepenPhase('idle');
    setDeepenQ(null);
    setDeepenAnswer(null);
    setDeepenObservation(null);
    setContributionSent(false);
    setShowContribute(false);
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

  const handleDeepen = async () => {
    setDeepenLoading(true);
    setDeepenPhase('loading');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'deepen',
          mode: 'deepen',
          pinContext: `${pin.title} (${pin.location.physicalArea.replace(/_/g, ' ')})`,
        }),
      });
      const data = await res.json();
      setDeepenQ(data.question || "What details here surprised you the most?");
      setDeepenPhase('question');
    } catch {
      setDeepenQ("What do you notice here that you didn't expect? Talk about it together.");
      setDeepenPhase('question');
    }
    setDeepenLoading(false);
  };

  const handleDeepenFollowUp = async (q: string) => {
    setDeepenPhase('loading');
    setDeepenAnswer(null);
    setDeepenObservation(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setDeepenAnswer(data.answer || '');
      setDeepenObservation(data.observation || null);
      setDeepenPhase(data.observation ? 'observe' : 'answer');
    } catch {
      setDeepenAnswer("I wasn't able to explore that further right now. Try asking something else about what you see.");
      setDeepenPhase('answer');
    }
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

      {/* Option 2: Keep talking about this */}
      <button
        onClick={handleDeepen}
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

              {renderThreeOptions(isIDontKnow(pin.inquiry.answer))}
            </div>
          ) : deepenPhase === 'loading' ? (
            /* ── DEEPEN LOADING ── */
            <div className="animate-fade-in">
              <p className="font-serif text-sm text-text-muted italic mb-4 leading-relaxed">Thinking of something to discuss...</p>
              <div className="flex items-center gap-3 py-6">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="w-2 h-2 rounded-full bg-sandstone animate-pulse" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          ) : deepenPhase === 'question' ? (
            /* ── DEEPEN QUESTION ── */
            <div className="animate-fade-in">
              <div className="rounded-xl border border-mosaic-blue/20 bg-warm-white p-5 mb-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-mosaic-blue text-lg mt-0.5 shrink-0">💬</span>
                  <p className="font-serif text-[1.1rem] leading-relaxed text-mosaic-blue">
                    {deepenQ}
                  </p>
                </div>
                <p className="text-xs text-text-muted font-sans">
                  Talk it over together. There&apos;s no right answer.
                </p>
              </div>

              {renderThreeOptions()}
            </div>
          ) : deepenPhase === 'observe' ? (
            /* ── DEEPEN OBSERVE PHASE ── */
            <div className="animate-fade-in">
              <div className="rounded-xl border border-aged-gold/30 bg-warm-white p-5 mb-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-aged-gold text-lg mt-0.5 shrink-0">👁</span>
                  <p className="font-serif text-[1.1rem] leading-relaxed text-mosaic-blue">
                    {deepenObservation}
                  </p>
                </div>
                <p className="text-xs text-text-muted font-sans">
                  Take a moment to look together. When you&apos;re ready, tap below.
                </p>
              </div>
              <button
                onClick={() => setDeepenPhase('answer')}
                className="w-full py-4 rounded-xl bg-mosaic-blue text-cream font-sans font-medium text-[15px] hover:bg-mosaic-blue-light active:scale-[.98] transition-all"
              >
                We&apos;ve looked — tell us more
              </button>
            </div>
          ) : deepenPhase === 'answer' ? (
            /* ── DEEPEN ANSWER ── */
            <div className="animate-fade-in">
              {deepenQ && (
                <p className="font-serif text-sm text-text-muted italic mb-3 leading-relaxed">&ldquo;{deepenQ}&rdquo;</p>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-sandstone-light/50" />
                <span className="text-aged-gold text-xs">&#10022;</span>
                <div className="flex-1 h-px bg-sandstone-light/50" />
              </div>

              <p className="font-serif text-[1.05rem] leading-[1.8] text-text-primary mb-2 whitespace-pre-line">
                {deepenAnswer}
              </p>

              {renderThreeOptions(deepenAnswer ? isIDontKnow(deepenAnswer) : false)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
