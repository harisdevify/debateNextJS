'use client';
import { createSocket } from '@/lib/socket';
import type {
  ChatMessage,
  DebateStatus,
  MatchedPayload,
} from '@/types';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface AckResponse {
  ok: boolean;
  message?: string;
}

/**
 * One socket for everything in the debate room:
 * matchmaking + WebRTC signaling + chat.
 *
 * status: 'starting' | 'searching' | 'connected' | 'peer-left' | 'blocked' | 'error'
 */
export function useDebateRoom(
  localVideoRef: RefObject<HTMLVideoElement | null>,
  remoteVideoRef: RefObject<HTMLVideoElement | null>
) {
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  // candidates that arrived before the SDP
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  const [status, setStatus] = useState<DebateStatus>('starting');
  const [peerName, setPeerName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  /* ── helpers ── */
  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    pendingIceRef.current = [];
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [remoteVideoRef]);

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    const local = localStreamRef.current;
    local?.getTracks().forEach((t) => pc.addTrack(t, local));

    pc.ontrack = (e) => {
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('ice-candidate', e.candidate);
    };

    peerRef.current = pc;
    return pc;
  }, [remoteVideoRef]);

  /* ── init ── */
  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;
    let cancelled = false;

    const flushIce = async (pc: RTCPeerConnection) => {
      const queued = pendingIceRef.current;
      pendingIceRef.current = [];
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.error('ICE error:', err);
        }
      }
    };

    // we only ask for a partner once the camera is ready AND the socket is up
    const startSearching = () => {
      if (localStreamRef.current && socket.connected) {
        socket.emit('find-partner');
      }
    };

    socket.on('connect', startSearching);

    socket.on('connect_error', (err: Error) => {
      setStatus('error');
      toast.error(
        err.message === 'Not authenticated'
          ? 'Please login again.'
          : 'Cannot reach the debate server.'
      );
    });

    socket.on('disconnect', () => {
      closePeer();
      setStatus('searching'); // socket.io reconnects, then 'connect' re-searches
    });

    socket.on('waiting', () => setStatus('searching'));

    socket.on('matched', async ({ initiator, peer }: MatchedPayload) => {
      closePeer();
      setMessages([]);
      setPeerName(peer?.fullname || '');
      setStatus('connected');

      const pc = createPeer();
      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', offer);
      }
    });

    socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
      const pc = peerRef.current ?? createPeer();
      await pc.setRemoteDescription(offer);
      await flushIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', answer);
    });

    socket.on('answer', async (answer: RTCSessionDescriptionInit) => {
      const pc = peerRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(answer);
      await flushIce(pc);
    });

    socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
      const pc = peerRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error('ICE error:', err);
      }
    });

    // the server double-checks the rules, even though the page already does
    socket.on('rules-required', () => {
      setStatus('error');
      toast.error('Please accept the rules first.');
    });

    socket.on('search-error', () => {
      setStatus('error');
      toast.error('Could not look for a partner. Please try again.');
    });

    socket.on('peer-left', () => {
      closePeer();
      setStatus('peer-left');
      toast.info('Your partner left the debate.');
    });

    socket.on('chatMessage', ({ text }: { text: string }) => {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, text, sender: 'other' },
      ]);
    });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        startSearching();
      } catch {
        if (!cancelled) {
          setStatus('error');
          toast.error('Please enable camera & microphone.');
        }
      }
    })();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      closePeer();
      socket.disconnect(); // server tells the partner via 'peer-left'
    };
  }, [createPeer, closePeer, localVideoRef]);

  /* ── actions ── */
  const findNext = useCallback(() => {
    closePeer();
    setMessages([]);
    setPeerName('');
    setStatus('searching');
    socketRef.current?.emit('find-partner');
  }, [closePeer]);

  /** Emit an event and wait for the server's { ok, message } answer. */
  const emitWithAck = useCallback(
    async (event: string, payload?: unknown): Promise<AckResponse> => {
      const socket = socketRef.current;
      if (!socket?.connected) return { ok: false, message: 'You are not connected.' };
      try {
        return (await socket
          .timeout(5000)
          .emitWithAck(event, ...(payload === undefined ? [] : [payload]))) as AckResponse;
      } catch {
        return { ok: false, message: 'The server did not answer. Please try again.' };
      }
    },
    []
  );

  /** Report the latest partner (also works right after they left). */
  const reportPartner = useCallback(
    async (reason: string, details: string) => {
      const res = await emitWithAck('report-partner', { reason, details });
      if (res.ok) toast.success('Report sent. Thank you for keeping the platform safe.');
      else toast.error(res.message ?? 'Could not send the report.');
      return res.ok;
    },
    [emitWithAck]
  );

  /** Block the current partner: the debate ends and you are never matched again. */
  const blockPartner = useCallback(async () => {
    const res = await emitWithAck('block-partner');
    if (!res.ok) {
      toast.error(res.message ?? 'Could not block this user.');
      return false;
    }
    closePeer();
    setMessages([]);
    setPeerName('');
    setStatus('blocked');
    toast.success('User blocked.');
    return true;
  }, [emitWithAck, closePeer]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      if (status !== 'connected') {
        toast.info('Wait until a partner joins to chat.');
        return false;
      }

      socketRef.current?.emit('chatMessage', trimmed);
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, text: trimmed, sender: 'me' },
      ]);
      return true;
    },
    [status]
  );

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    toast.info(track.enabled ? 'Mic Unmuted' : 'Mic Muted');
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    toast.info(track.enabled ? 'Camera On' : 'Camera Off');
  };

  return {
    status,
    peerName,
    messages,
    sendMessage,
    findNext,
    reportPartner,
    blockPartner,
    toggleMic,
    toggleCamera,
  };
}
