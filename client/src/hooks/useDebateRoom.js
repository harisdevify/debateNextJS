'use client';
import { createSocket } from '@/lib/socket';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

/**
 * One socket for everything in the debate room:
 * matchmaking + WebRTC signaling + chat.
 *
 * status: 'starting' | 'searching' | 'connected' | 'peer-left' | 'error'
 */
export function useDebateRoom(localVideoRef, remoteVideoRef) {
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const pendingIceRef = useRef([]); // candidates that arrived before the SDP

  const [status, setStatus] = useState('starting');
  const [peerName, setPeerName] = useState('');
  const [messages, setMessages] = useState([]);

  /* ── helpers ── */
  const closePeer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    pendingIceRef.current = [];
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [remoteVideoRef]);

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current
      ?.getTracks()
      .forEach((t) => pc.addTrack(t, localStreamRef.current));

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

    const flushIce = async (pc) => {
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

    socket.on('connect_error', (err) => {
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

    socket.on('matched', async ({ initiator, peer }) => {
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

    socket.on('offer', async (offer) => {
      const pc = peerRef.current ?? createPeer();
      await pc.setRemoteDescription(offer);
      await flushIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', answer);
    });

    socket.on('answer', async (answer) => {
      const pc = peerRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(answer);
      await flushIce(pc);
    });

    socket.on('ice-candidate', async (candidate) => {
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

    socket.on('peer-left', () => {
      closePeer();
      setStatus('peer-left');
      toast.info('Your partner left the debate.');
    });

    socket.on('chatMessage', ({ text }) => {
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

  const sendMessage = useCallback(
    (text) => {
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
    toggleMic,
    toggleCamera,
  };
}
