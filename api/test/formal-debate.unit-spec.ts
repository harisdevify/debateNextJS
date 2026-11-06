import { formalClock, FORMAL_DURATION_MS } from '../src/modules/realtime/formal-debate-clock';

describe('formal debate server clock', () => {
  const start = 1_800_000_000_000;
  it('starts with the first speaker and uses absolute timestamps', () => {
    expect(formalClock(start, start)).toMatchObject({
      startedAt: start, serverNow: start, turnNumber: 1,
      turnEndsAt: start + 120_000, speakerIndex: 0, completed: false,
    });
    expect(formalClock(start, start + 119_999).speakerIndex).toBe(0);
  });
  it('switches speakers exactly at each authoritative boundary', () => {
    expect(formalClock(start, start + 120_000)).toMatchObject({ turnNumber: 2, speakerIndex: 1 });
    expect(formalClock(start, start + 240_000)).toMatchObject({ turnNumber: 3, speakerIndex: 0 });
    expect(formalClock(start, start + 360_000)).toMatchObject({ turnNumber: 4, speakerIndex: 1 });
    expect(formalClock(start, start + 480_000)).toMatchObject({ turnNumber: 5, speakerIndex: 0, turnEndsAt: start + 540_000 });
    expect(formalClock(start, start + 540_000)).toMatchObject({ turnNumber: 6, speakerIndex: 1, turnEndsAt: start + 600_000 });
  });
  it('does not reset when clients reconnect or their clocks differ', () => {
    const before = formalClock(start, start + 300_000);
    const reconnect = formalClock(start, start + 311_000);
    expect(before.turnNumber).toBe(3);
    expect(reconnect.startedAt).toBe(start);
    expect(reconnect.turnEndsAt).toBe(before.turnEndsAt);
    expect(reconnect.endsAt).toBe(start + FORMAL_DURATION_MS);
  });
  it('completes at ten minutes without creating another speaking turn', () => {
    expect(formalClock(start, start + 599_999).completed).toBe(false);
    expect(formalClock(start, start + 600_000).completed).toBe(true);
    expect(formalClock(start, start + 1_000_000).turnNumber).toBe(6);
  });
});
