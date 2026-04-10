'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  initialQuestion?: string;
  onClose: () => void;
}

export default function AskSheet({ initialQuestion, onClose }: Props) {
  const [question, setQuestion] = useState(initialQuestion || '');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialQuestion) ask(initialQuestion);
    else inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => { setClosing(true); setTimeout(onClose, 300); };

  const ask = async (q: string) => {
    setLoading(true);
    setAsked(true);
    setAnswer('');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAnswer(data.answer);
    } catch {
      setAnswer("I wasn't able to answer that right now. Try asking about something you can see in or around the church — the mosaics, windows, carvings, or the people who built it.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) ask(question.trim());
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-30" style={{ height: '60%' }}>
      <div className="absolute inset-0 -top-[50vh]" onClick={close} />
      <div
        className={`relative h-full bg-cream rounded-t-3xl flex flex-col texture-linen ${closing ? 'animate-slide-down' : 'animate-slide-up'}`}
        style={{ boxShadow: '0 -4px 30px rgba(44,36,25,.15)' }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-sandstone-light" /></div>
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <span className="text-[11px] font-sans font-medium text-text-muted uppercase tracking-wider">Your question</span>
          <button onClick={close} className="text-text-muted hover:text-text-secondary p-1" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto inquiry-scroll px-5 pb-6">
          {!asked ? (
            <div className="animate-fade-in">
              <p className="font-serif text-lg text-mosaic-blue mb-3 leading-relaxed">What are you curious about?</p>
              <p className="font-sans text-sm text-text-secondary mb-5 leading-relaxed">Ask about anything you see in or around Memorial Church — the mosaics, windows, carvings, architecture, or the people who made it all.</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input ref={inputRef} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Why are there so many angels?" className="w-full px-4 py-3.5 rounded-xl bg-warm-white border border-sandstone-light/50 text-base font-sans text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-mosaic-blue/30 focus:ring-1 focus:ring-mosaic-blue/20" />
                <button type="submit" disabled={!question.trim()} className="w-full py-3.5 rounded-xl bg-mosaic-blue text-cream font-sans font-medium text-base disabled:opacity-40 hover:bg-mosaic-blue-light active:scale-[.98] transition-all">Ask</button>
              </form>
            </div>
          ) : (
            <div className="animate-fade-in">
              <p className="font-serif text-lg text-mosaic-blue mb-3 leading-relaxed">&ldquo;{question}&rdquo;</p>
              {loading ? (
                <div className="flex items-center gap-3 py-8">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((d) => <div key={d} className="w-2 h-2 rounded-full bg-sandstone animate-pulse" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                  <span className="text-sm text-text-muted font-sans">Looking through the knowledge base...</span>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-sandstone-light/50" /><span className="text-aged-gold text-xs">&#10022;</span><div className="flex-1 h-px bg-sandstone-light/50" /></div>
                  <p className="font-serif text-[1.05rem] leading-[1.8] text-text-primary">{answer}</p>
                  <div className="mt-6 pt-4 border-t border-sandstone-light/30">
                    <form onSubmit={(e) => { e.preventDefault(); const inp = e.currentTarget.querySelector('input') as HTMLInputElement; if (inp.value.trim()) { setQuestion(inp.value.trim()); ask(inp.value.trim()); inp.value = ''; } }} className="flex gap-2">
                      <input placeholder="Ask something else..." className="flex-1 px-4 py-3 rounded-xl bg-warm-white border border-sandstone-light/50 text-sm font-sans text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-mosaic-blue/30 focus:ring-1 focus:ring-mosaic-blue/20" />
                      <button type="submit" className="px-4 py-3 rounded-xl bg-mosaic-blue text-cream text-sm font-sans font-medium hover:bg-mosaic-blue-light active:scale-[.98] transition-all">Ask</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
