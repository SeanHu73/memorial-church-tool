'use client';

import { useState, useRef, useEffect } from 'react';
import { Pin } from '@/lib/types';
import { seedPins } from '@/lib/seed-pins';
import { incrementCount, resetCounter, shouldOfferZoomOut } from '@/lib/inquiry-counter';

interface Props {
  initialQuestion?: string;
  onClose: () => void;
  onNavigateToPin?: (pinId: string) => void;
}

type Phase = 'input' | 'loading' | 'observe' | 'answer';

export default function AskSheet({ initialQuestion, onClose, onNavigateToPin }: Props) {
  const [question, setQuestion] = useState(initialQuestion || '');
  const [observation, setObservation] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>(initialQuestion ? 'loading' : 'input');
  const [closing, setClosing] = useState(false);
  const [ownQ, setOwnQ] = useState('');
  const [deepenQ, setDeepenQ] = useState<string | null>(null);
  const [deepenMode, setDeepenMode] = useState<'deepen' | 'zoom_out'>('deepen');
  const [deepenLoading, setDeepenLoading] = useState(false);
  const [contributionText, setContributionText] = useState('');
  const [contributionSent, setContributionSent] = useState(false);
  const [offerZoomOut, setOfferZoomOut] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find a suggested next pin (pick a random one for free-form questions)
  const suggestedPin: Pin | null = seedPins.length > 0 ? seedPins[Math.floor(Math.random() * seedPins.length)] : null;

  useEffect(() => {
    setOfferZoomOut(shouldOfferZoomOut());
    if (initialQuestion) ask(initialQuestion);
    else inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => { setClosing(true); setTimeout(onClose, 300); };

  const ask = async (q: string) => {
    setPhase('loading');
    setObservation(null);
    setAnswer('');
    setQuestion(q);
    setDeepenQ(null);
    setContributionSent(false);
    scrollRef.current?.scrollTo(0, 0);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAnswer(data.answer || '');
      setObservation(data.observation || null);
      setPhase(data.observation ? 'observe' : 'answer');
      // Count this as an inquiry once we have the answer
      incrementCount();
      setOfferZoomOut(shouldOfferZoomOut());
    } catch {
      setAnswer("I wasn't able to answer that right now. Try asking about something you can see in or around the church — the mosaics, windows, carvings, or the people who built it.");
      setObservation(null);
      setPhase('answer');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) ask(question.trim());
  };

  const revealAnswer = () => {
    setPhase('answer');
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 80);
  };

  const submitOwn = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownQ.trim()) {
      ask(ownQ.trim());
      setOwnQ('');
    }
  };

  const handleDeepenOrZoom = async (kind: 'deepen' | 'zoom_out') => {
    setDeepenLoading(true);
    setDeepenMode(kind);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: kind,
          mode: kind,
          pinContext: `Memorial Church (general area)`,
        }),
      });
      const data = await res.json();
      setDeepenQ(data.question || (kind === 'zoom_out'
        ? 'Turn around and look back across the Quad. How does this church fit into the larger story of what the Stanfords built here?'
        : "What details here surprised you the most?"));

      if (kind === 'zoom_out') {
        resetCounter();
      } else {
        incrementCount();
      }
      setOfferZoomOut(shouldOfferZoomOut());
    } catch {
      setDeepenQ(kind === 'zoom_out'
        ? 'Step back and look at the whole building. What would be missing from this campus if the church weren\'t here?'
        : "What do you notice here that you didn't expect? Talk about it together.");
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
          pinId: null,
          question,
          contribution: contributionText.trim(),
        }),
      });
    } catch {
      // Silent failure
    }
    setContributionSent(true);
    setContributionText('');
  };

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
      {suggestedPin && onNavigateToPin && (
        <button
          onClick={() => { onNavigateToPin(suggestedPin.id); onClose(); }}
          className="w-full text-left p-4 rounded-xl border border-sandstone-light/50 bg-warm-white hover:border-aged-gold/50 hover:bg-cream transition-all group"
        >
          <div className="flex items-start gap-3">
            <span className="text-aged-gold mt-0.5 shrink-0 text-lg group-hover:translate-x-0.5 transition-transform">→</span>
            <div>
              <p className="text-xs font-sans font-medium text-text-muted mb-1 uppercase tracking-wider">See something connected</p>
              <p className="font-serif text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">Explore {suggestedPin.title} — {suggestedPin.location.physicalArea.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </button>
      )}

      {/* Option 2: Keep talking OR Step back */}
      {!deepenQ ? (
        offerZoomOut ? (
          <button
            onClick={() => handleDeepenOrZoom('zoom_out')}
            disabled={deepenLoading}
            className="w-full text-left p-4 rounded-xl border border-mosaic-teal/40 bg-warm-white hover:border-mosaic-teal/70 hover:bg-cream transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="text-mosaic-teal mt-0.5 shrink-0 text-lg">🧭</span>
              <div>
                <p className="text-xs font-sans font-medium text-text-muted mb-1 uppercase tracking-wider">Step back and see the bigger picture</p>
                <p className="font-serif text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">
                  {deepenLoading ? 'Widening the frame...' : 'Widen the frame — how does this connect to the rest of the campus, the era, the larger story?'}
                </p>
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
                <p className="font-serif text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">
                  {deepenLoading ? 'Thinking...' : 'Get a question to discuss together right here'}
                </p>
              </div>
            </div>
          </button>
        )
      ) : (
        <div className={`p-4 rounded-xl border bg-warm-white animate-fade-in ${deepenMode === 'zoom_out' ? 'border-mosaic-teal/30' : 'border-mosaic-blue/20'}`}>
          <div className="flex items-start gap-3 mb-2">
            <span className={`text-lg mt-0.5 shrink-0 ${deepenMode === 'zoom_out' ? 'text-mosaic-teal' : 'text-mosaic-blue'}`}>
              {deepenMode === 'zoom_out' ? '🧭' : '💬'}
            </span>
            <p className="font-serif text-[1rem] leading-relaxed text-mosaic-blue">{deepenQ}</p>
          </div>
          <p className="text-xs text-text-muted font-sans mt-2">
            {deepenMode === 'zoom_out'
              ? 'Step back together. There\'s no right answer.'
              : 'Talk it over together. There\'s no right answer.'}
          </p>
        </div>
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

      {/* Contribution option */}
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
    <div className="absolute inset-x-0 bottom-0 z-30" style={{ height: '78%' }}>
      <div className="absolute inset-0 -top-[50vh]" onClick={close} />
      <div
        className={`relative h-full bg-cream rounded-t-3xl flex flex-col texture-linen ${closing ? 'animate-slide-down' : 'animate-slide-up'}`}
        style={{ boxShadow: '0 -4px 30px rgba(44,36,25,.15)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-sandstone-light" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <span className="text-[11px] font-sans font-medium text-text-muted uppercase tracking-wider">Your question</span>
          <button onClick={close} className="text-text-muted hover:text-text-secondary p-1" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto inquiry-scroll px-5 pb-6">

          {/* INPUT PHASE */}
          {phase === 'input' && (
            <div className="animate-fade-in">
              <p className="font-serif text-lg text-mosaic-blue mb-3 leading-relaxed">What are you curious about?</p>
              <p className="font-sans text-sm text-text-secondary mb-5 leading-relaxed">
                Ask about anything you see in or around Memorial Church — the mosaics, windows, carvings, architecture, or the people who made it all.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Why are there so many angels?"
                  className="w-full px-4 py-3.5 rounded-xl bg-warm-white border border-sandstone-light/50 text-base font-sans text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-mosaic-blue/30 focus:ring-1 focus:ring-mosaic-blue/20"
                />
                <button
                  type="submit"
                  disabled={!question.trim()}
                  className="w-full py-3.5 rounded-xl bg-mosaic-blue text-cream font-sans font-medium text-base disabled:opacity-40 hover:bg-mosaic-blue-light active:scale-[.98] transition-all"
                >
                  Ask
                </button>
              </form>
            </div>
          )}

          {/* LOADING PHASE */}
          {phase === 'loading' && (
            <div className="animate-fade-in">
              <p className="font-serif text-lg text-mosaic-blue mb-6 leading-relaxed">&ldquo;{question}&rdquo;</p>
              <div className="flex items-center gap-3 py-6">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="w-2 h-2 rounded-full bg-sandstone animate-pulse" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
                <span className="text-sm text-text-muted font-sans">Looking through the knowledge base...</span>
              </div>
            </div>
          )}

          {/* OBSERVE PHASE — look first, then reveal */}
          {phase === 'observe' && (
            <div className="animate-fade-in">
              <p className="font-serif text-sm text-text-muted italic mb-4 leading-relaxed">&ldquo;{question}&rdquo;</p>

              <div className="rounded-xl border border-aged-gold/30 bg-warm-white p-5 mb-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-aged-gold text-lg mt-0.5 shrink-0">👁</span>
                  <p className="font-serif text-[1.1rem] leading-relaxed text-mosaic-blue">
                    {observation}
                  </p>
                </div>
                <p className="text-xs text-text-muted font-sans">
                  Take a moment to look together. When you&apos;re ready, tap below.
                </p>
              </div>

              <button
                onClick={revealAnswer}
                className="w-full py-4 rounded-xl bg-mosaic-blue text-cream font-sans font-medium text-[15px] hover:bg-mosaic-blue-light active:scale-[.98] transition-all"
              >
                We&apos;ve looked — tell us more
              </button>
            </div>
          )}

          {/* ANSWER PHASE */}
          {phase === 'answer' && (
            <div className="animate-fade-in">
              <p className="font-serif text-sm text-text-muted italic mb-3 leading-relaxed">&ldquo;{question}&rdquo;</p>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-sandstone-light/50" />
                <span className="text-aged-gold text-xs">&#10022;</span>
                <div className="flex-1 h-px bg-sandstone-light/50" />
              </div>

              <p className="font-serif text-[1.05rem] leading-[1.85] text-text-primary whitespace-pre-line">
                {answer}
              </p>

              {renderThreeOptions(isIDontKnow(answer))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
