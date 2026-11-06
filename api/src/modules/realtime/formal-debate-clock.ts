/** Server-authoritative formal debate clock, expressed as absolute epoch milliseconds.
 * Four 2-minute turns followed by two 1-minute turns yield 5 minutes per speaker.
 */
export const FORMAL_DURATION_MS = 10 * 60_000;
export const FORMAL_RECONNECT_GRACE_MS = 20_000;
const TURN_BOUNDARIES_MS = [0, 120_000, 240_000, 360_000, 480_000, 540_000, 600_000] as const;

export interface FormalClock {
  serverNow: number;
  startedAt: number;
  endsAt: number;
  turnEndsAt: number;
  turnNumber: number;
  speakerIndex: 0 | 1;
  completed: boolean;
}

export function formalClock(startedAt: number, now = Date.now()): FormalClock {
  const elapsed = Math.max(0, now - startedAt);
  const completed = elapsed >= FORMAL_DURATION_MS;
  let index = TURN_BOUNDARIES_MS.length - 2;
  if (!completed) {
    for (let i = 0; i < TURN_BOUNDARIES_MS.length - 1; i++) {
      if (elapsed < TURN_BOUNDARIES_MS[i + 1]) {
        index = i;
        break;
      }
    }
  }
  return {
    serverNow: now,
    startedAt,
    endsAt: startedAt + FORMAL_DURATION_MS,
    turnEndsAt: startedAt + TURN_BOUNDARIES_MS[index + 1],
    turnNumber: index + 1,
    speakerIndex: (index % 2) as 0 | 1,
    completed,
  };
}
