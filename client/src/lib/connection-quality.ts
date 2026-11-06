export type ConnectionQuality = 'checking' | 'good' | 'unstable' | 'poor';

export interface PacketSample {
  packetsReceived: number;
  packetsLost: number;
  timestamp: number;
}

export interface ConnectionSample {
  quality: ConnectionQuality;
  next: Map<string, PacketSample>;
}

/**
 * Uses deltas between successful inbound media samples; does not infer quality
 * from signaling state or fabricate bandwidth/latency estimates.
 */
export function analyzeInboundStats(
  report: RTCStatsReport,
  previous: Map<string, PacketSample>,
): ConnectionSample {
  const next = new Map<string, PacketSample>();
  let packetsReceived = 0;
  let packetsLost = 0;
  let maxJitter = 0;
  let measured = false;
  report.forEach((entry) => {
    if (entry.type !== 'inbound-rtp' || entry.isRemote) return;
    const received = Number(entry.packetsReceived);
    const lost = Number(entry.packetsLost);
    if (!Number.isFinite(received) || !Number.isFinite(lost)) return;
    const timestamp = Number(entry.timestamp);
    if (!Number.isFinite(timestamp)) return;
    next.set(entry.id, { packetsReceived: received, packetsLost: lost, timestamp });
    const before = previous.get(entry.id);
    if (!before || timestamp <= before.timestamp || received < before.packetsReceived || lost < before.packetsLost) return;
    const receivedDelta = received - before.packetsReceived;
    const lostDelta = lost - before.packetsLost;
    if (receivedDelta + lostDelta <= 0) return;
    measured = true;
    packetsReceived += receivedDelta;
    packetsLost += lostDelta;
    // RTC jitter is seconds; prefer audio jitter where available.
    if (entry.kind === 'audio' || entry.mediaType === 'audio') {
      const jitter = Number(entry.jitter);
      if (Number.isFinite(jitter)) maxJitter = Math.max(maxJitter, jitter);
    }
  });
  if (!measured) return { quality: 'checking', next };
  const lossRate = packetsLost / (packetsReceived + packetsLost);
  const quality = lossRate >= 0.1 || maxJitter >= 0.08
    ? 'poor' : lossRate >= 0.03 || maxJitter >= 0.03
      ? 'unstable' : 'good';
  return { quality, next };
}
