/**
 * Safe, local-only connection route diagnostics.
 * Never return IP addresses, relay credentials or candidate strings.
 */
export type ConnectionRoute = 'checking' | 'direct' | 'relay';

type StatsEntry = { id: string; type: string; [key: string]: unknown };

export function detectConnectionRoute(report: RTCStatsReport): ConnectionRoute {
  const stats = new Map<string, StatsEntry>();
  report.forEach((entry) => stats.set(entry.id, entry as StatsEntry));

  // Modern implementations expose the nominated candidate pair via transport.
  const selectedPairId = [...stats.values()].find(
    (entry) => entry.type === 'transport' && typeof entry.selectedCandidatePairId === 'string',
  )?.selectedCandidatePairId;

  const selectedPair = (typeof selectedPairId === 'string'
    ? stats.get(selectedPairId)
    : [...stats.values()].find((entry) =>
        entry.type === 'candidate-pair' && entry.selected === true && entry.state === 'succeeded'
      ));

  if (!selectedPair || selectedPair.type !== 'candidate-pair') return 'checking';
  const local = stats.get(String(selectedPair.localCandidateId ?? ''));
  const remote = stats.get(String(selectedPair.remoteCandidateId ?? ''));
  if (!local || !remote || local.type !== 'local-candidate' || remote.type !== 'remote-candidate') {
    return 'checking';
  }

  return local.candidateType === 'relay' || remote.candidateType === 'relay' ? 'relay' : 'direct';
}
