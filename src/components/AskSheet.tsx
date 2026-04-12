'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  initialQuestion?: string;
  onClose: () => void;
}

type Phase = 'input' | 'loading' | 'observe' | 'answer';

export default function AskSheet({ initialQuestion, onClose }: Props) {
  const [question, setQuestion] = useState(initialQuestion || '');
  const [observation, setObservation] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>(initialQuestion ? 'loading' : 'input');
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      // If there's a natural observation, pause there first; otherwise go straight to answer
      setPhase(data.observation ? 'observe' : 'answer');
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

  const askAnother = (q: string) => {
    if (q.trim()) ask(q.trim());
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-30" style={{ height: '65%' }}>
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

              {/* Ask another */}
              <div className="mt-6 pt-4 border-t border-sandstone-light/30">
                <p className="text-[11px] text-text-muted font-sans mb-2 uppercase tracking-wider">What else are you curious about?</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const inp = e.currentTarget.querySelector('input') as HTMLInputElement;
                    if (inp.value.trim()) {
                      askAnother(inp.value.trim());
                      inp.value = '';
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    placeholder="Ask something else..."
                    className="flex-1 px-4 py-3 rounded-xl bg-warm-white border border-sandstone-light/50 text-sm font-sans text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-mosaic-blue/30 focus:ring-1 focus:ring-mosaic-blue/20"
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 rounded-xl bg-mosaic-blue text-cream text-sm font-sans font-medium hover:bg-mosaic-blue-light active:scale-[.98] transition-all"
                  >
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
