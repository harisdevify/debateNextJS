/**
 * Parse untrusted WebRTC signaling without accepting arbitrary objects or
 * oversized payloads. Only the fields needed by the browser are relayed.
 */
export const MAX_SDP_BYTES = 64 * 1024;
export const MAX_ICE_CANDIDATE_BYTES = 4096;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function parseSignal(
  event: 'offer' | 'answer' | 'ice-candidate',
  payload: unknown,
  matchId: string | undefined,
): { matchId: string; data: Record<string, unknown> } | null {
  const wrapper = record(payload);
  const data = record(wrapper?.data);
  if (!matchId || wrapper?.matchId !== matchId || !data) return null;

  if (event === 'offer' || event === 'answer') {
    const sdp = data.sdp;
    if (data.type !== event || typeof sdp !== 'string' ||
        sdp.length === 0 || Buffer.byteLength(sdp, 'utf8') > MAX_SDP_BYTES ||
        !sdp.startsWith('v=0') || !/\r?\nm=/.test(sdp) ||
        !/\r?\nt=/.test(sdp) || sdp.includes('\0')) return null;
    return { matchId, data: { type: event, sdp } };
  }

  const candidate = data.candidate;
  if (typeof candidate !== 'string' || candidate.length === 0 ||
      Buffer.byteLength(candidate, 'utf8') > MAX_ICE_CANDIDATE_BYTES ||
      !/^(?:a=)?candidate:[^\r\n\0]+$/.test(candidate)) return null;
  if (data.sdpMid !== undefined &&
      data.sdpMid !== null &&
      (typeof data.sdpMid !== 'string' || data.sdpMid.length > 128)) return null;
  if (data.sdpMLineIndex !== undefined &&
      data.sdpMLineIndex !== null &&
      (!Number.isInteger(data.sdpMLineIndex) || (data.sdpMLineIndex as number) < 0 ||
       (data.sdpMLineIndex as number) > 255)) return null;
  const sanitized: Record<string, unknown> = { candidate };
  if (data.sdpMid !== undefined) sanitized.sdpMid = data.sdpMid;
  if (data.sdpMLineIndex !== undefined) sanitized.sdpMLineIndex = data.sdpMLineIndex;
  if (typeof data.usernameFragment === 'string' && data.usernameFragment.length <= 256)
    sanitized.usernameFragment = data.usernameFragment;
  return { matchId, data: sanitized };
}
