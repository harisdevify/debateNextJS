import { describe, expect, it } from 'vitest';
import { detectConnectionRoute } from './connection-route';

const makeReport = (entries: Array<Record<string, unknown>>) => ({
  forEach: (cb: (entry: unknown) => void) => entries.forEach(cb),
}) as unknown as RTCStatsReport;

describe('WebRTC connection route diagnostics', () => {
  it('identifies a TURN relay without exposing candidate addresses', () => {
    const stats = makeReport([
      { id: 'transport', type: 'transport', selectedCandidatePairId: 'pair' },
      { id: 'pair', type: 'candidate-pair', localCandidateId: 'local', remoteCandidateId: 'remote', state: 'succeeded' },
      { id: 'local', type: 'local-candidate', candidateType: 'relay', address: '192.0.2.1' },
      { id: 'remote', type: 'remote-candidate', candidateType: 'srflx', address: '198.51.100.10' },
    ]);
    expect(detectConnectionRoute(stats)).toBe('relay');
  });

  it('recognizes direct peer routes', () => {
    expect(detectConnectionRoute(makeReport([
      { id: 'pair', type: 'candidate-pair', selected: true, state: 'succeeded', localCandidateId: 'a', remoteCandidateId: 'b' },
      { id: 'a', type: 'local-candidate', candidateType: 'host' },
      { id: 'b', type: 'remote-candidate', candidateType: 'srflx' },
    ]))).toBe('direct');
  });

  it('does not guess before the selected pair and its candidates are available', () => {
    expect(detectConnectionRoute(makeReport([]))).toBe('checking');
    expect(detectConnectionRoute(makeReport([
      { id: 'transport', type: 'transport', selectedCandidatePairId: 'missing' },
    ]))).toBe('checking');
    expect(detectConnectionRoute(makeReport([
      { id: 'pair', type: 'candidate-pair', selected: true, state: 'succeeded', localCandidateId: 'a', remoteCandidateId: 'b' },
      { id: 'a', type: 'local-candidate', candidateType: 'relay' },
    ]))).toBe('checking');
  });
});
