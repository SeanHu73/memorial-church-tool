/**
 * Client-side tour event logger.
 *
 * Fire-and-forget calls to /api/log-tour, which appends rows to
 * the same Google Sheet as the ask logger. No await, no error
 * handling — if it fails, it fails silently.
 */

export function logReflection(opts: {
  tourId: string;
  sessionId: string;
  tourTitle: string;
  stopIndex: number;
  stopTitle: string;
  score: number;
  followUpResponse: string | null;
}): void {
  fire({
    event: 'reflection',
    tourId: opts.tourId,
    sessionId: opts.sessionId,
    tourTitle: opts.tourTitle,
    stopIndex: opts.stopIndex,
    stopTitle: opts.stopTitle,
    reflectionScore: opts.score,
    followUpResponse: opts.followUpResponse,
    timestamp: new Date().toISOString(),
  });
}

export function logQuestionRouted(opts: {
  tourId: string;
  sessionId: string;
  tourTitle: string;
  stopIndex: number;
  stopTitle: string;
  questionText: string;
  routing: 'coming_up' | 'answered_off_path' | 'banked';
}): void {
  fire({
    event: opts.routing === 'banked' ? 'question_banked' : 'question_routed',
    tourId: opts.tourId,
    sessionId: opts.sessionId,
    tourTitle: opts.tourTitle,
    stopIndex: opts.stopIndex,
    stopTitle: opts.stopTitle,
    questionText: opts.questionText,
    questionRouting: opts.routing,
    timestamp: new Date().toISOString(),
  });
}

export function logTourComplete(opts: {
  tourId: string;
  sessionId: string;
  tourTitle: string;
  stopsCompleted: number;
  totalStops: number;
  startedAt: string;
}): void {
  const started = new Date(opts.startedAt).getTime();
  const durationMinutes = Math.round((Date.now() - started) / 60000);
  fire({
    event: 'tour_complete',
    tourId: opts.tourId,
    sessionId: opts.sessionId,
    tourTitle: opts.tourTitle,
    stopsCompleted: opts.stopsCompleted,
    totalStops: opts.totalStops,
    durationMinutes,
    timestamp: new Date().toISOString(),
  });
}

function fire(entry: Record<string, unknown>): void {
  fetch('/api/log-tour', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
    keepalive: true,
  }).catch(() => {});
}
