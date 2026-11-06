import { describe, expect, it } from 'vitest';
import { analyzeInboundStats } from './connection-quality';

function report(entries: Record<string, unknown>[]): RTCStatsReport {
  return new Map(entries.map((item) => [String(item.id), item])) as unknown as RTCStatsReport;
}
const first = (received: number, lost: number, jitter = 0.01, timestamp = 1000) =>
  report([{ id: 'audio-1', type: 'inbound-rtp', kind: 'audio', timestamp,
    packetsReceived: received, packetsLost: lost, jitter }]);

describe('connection quality from actual inbound RTP deltas', () => {
  it('never claims good quality without consecutive media samples', () => {
    const r = analyzeInboundStats(first(100, 0), new Map());
    expect(r.quality).toBe('checking');
    expect(analyzeInboundStats(first(100, 0, 0.01, 2000), r.next).quality).toBe('checking');
  });
  it('classifies measured loss and high jitter', () => {
    const before = analyzeInboundStats(first(100, 0), new Map()).next;
    expect(analyzeInboundStats(first(200, 1, 0.01, 2000), before).quality).toBe('good');
    expect(analyzeInboundStats(first(200, 5, 0.01, 2000), before).quality).toBe('unstable');
    expect(analyzeInboundStats(first(200, 15, 0.01, 2000), before).quality).toBe('poor');
    expect(analyzeInboundStats(first(200, 0, 0.09, 2000), before).quality).toBe('poor');
  });
  it('ignores non-inbound reports, resets, and unrelated entries', () => {
    const before = analyzeInboundStats(first(100, 10), new Map()).next;
    const stale = report([{ id: 'audio-1', type: 'inbound-rtp', kind: 'audio', timestamp: 500,
      packetsReceived: 200, packetsLost: 30 }]);
    expect(analyzeInboundStats(stale, before).quality).toBe('checking');
    expect(analyzeInboundStats(report([{ id: 'candidate', type: 'candidate-pair' }]), before).quality).toBe('checking');
  });
});
