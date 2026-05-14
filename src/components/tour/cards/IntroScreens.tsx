'use client';

/**
 * Tour introduction screens — a sequence of cards that orient the
 * group before the tour begins. Explains what they'll be doing,
 * how the phone is shared, and what to expect.
 */

import { useState } from 'react';
import { Tour } from '@/lib/types';

interface Props {
  tour: Tour;
  onComplete: () => void;
}

const screens = [
  {
    title: 'Welcome',
    body: 'You\'re about to explore this place together — not as a guided tour you listen to, but as an investigation you lead.',
  },
  {
    title: 'How this works',
    body: 'This phone is shared. Pass it around. Read aloud to each other. The experience is designed for your group, not for one person looking at a screen.',
  },
  {
    title: 'The rhythm',
    body: 'At each stop you\'ll get a bit of background, then be asked to look at something real, then discuss what you think — and finally, discover context that might shift your thinking.',
  },
  {
    title: 'Your curiosity matters',
    body: 'Along the way, you can ask your own questions. Some might be answered on the tour. Others we\'ll save — every question is worth asking.',
  },
  {
    title: 'Ready?',
    body: 'Look up from the screen often. Talk to each other more than you read. The place is the teacher — the phone is just the starting point.',
  },
];

export default function IntroScreens({ tour, onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const screen = screens[current];
  const isLast = current === screens.length - 1;

  return (
    <div className="animate-fade-in flex flex-col justify-center min-h-full space-y-8 text-center">
      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {screens.map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-colors"
            style={{ backgroundColor: i <= current ? '#C4923A' : '#D4BFA0' }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4 px-2" key={current}>
        <p className="text-xl uppercase tracking-[0.14em] text-[#C4923A] font-semibold animate-fade-in">
          {screen.title}
        </p>
        <p className="text-[20px] leading-relaxed font-serif text-[#2C2418] animate-fade-in">
          {screen.body}
        </p>
      </div>

      {/* Navigation */}
      <div className="space-y-3">
        <button
          onClick={isLast ? onComplete : () => setCurrent(current + 1)}
          className="w-full py-3 rounded-lg text-sm font-semibold bg-[#C4923A] text-white"
        >
          {isLast ? 'Begin' : 'Next'}
        </button>
        {!isLast && (
          <button
            onClick={onComplete}
            className="text-xs text-[#6B5D4F]/50 hover:text-[#6B5D4F] transition-colors"
          >
            Skip introduction
          </button>
        )}
      </div>
    </div>
  );
}
