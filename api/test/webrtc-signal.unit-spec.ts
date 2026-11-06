import { parseSignal, MAX_SDP_BYTES, MAX_ICE_CANDIDATE_BYTES } from '../src/modules/realtime/webrtc-signal.validation';

describe('WebRTC signaling validation', () => {
  const id = 'match-1';
  const sdp = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';
  const candidate = 'candidate:1 1 UDP 2122260223 192.0.2.1 5000 typ host';

  it('accepts valid SDP and strips extra fields', () => {
    expect(parseSignal('offer', { matchId: id, data: { type: 'offer', sdp, extra: 'bad' } }, id))
      .toEqual({ matchId: id, data: { type: 'offer', sdp } });
    expect(parseSignal('answer', { matchId: id, data: { type: 'answer', sdp } }, id)).not.toBeNull();
  });
  it('rejects malformed, mismatched and oversized SDP', () => {
    for (const value of [
      null, [], { matchId: 'stale', data: { type: 'offer', sdp } },
      { matchId: id, data: { type: 'answer', sdp } },
      { matchId: id, data: { type: 'offer', sdp: 'garbage' } },
      { matchId: id, data: { type: 'offer', sdp: 'v=0\nm=audio\n' } },
      { matchId: id, data: { type: 'offer', sdp: sdp + 'x'.repeat(MAX_SDP_BYTES) } },
    ]) expect(parseSignal('offer', value, id)).toBeNull();
  });
  it('accepts browser ICE fields and rejects malformed candidates', () => {
    expect(parseSignal('ice-candidate', {
      matchId: id, data: { candidate, sdpMid: '0', sdpMLineIndex: 0, usernameFragment: 'abc', unused: true },
    }, id)).toEqual({
      matchId: id, data: { candidate, sdpMid: '0', sdpMLineIndex: 0, usernameFragment: 'abc' },
    });
    for (const data of [
      { candidate: 'bad' },
      { candidate: '' },
      { candidate: 'candidate:foo\r\nInjected' },
      { candidate: candidate + 'x'.repeat(MAX_ICE_CANDIDATE_BYTES) },
      { candidate, sdpMLineIndex: -1 },
      { candidate, sdpMid: 'x'.repeat(129) },
    ]) expect(parseSignal('ice-candidate', { matchId: id, data }, id)).toBeNull();
  });
});
