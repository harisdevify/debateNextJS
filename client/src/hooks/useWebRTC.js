'use client';
import { useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

const SOCKET_URL = 'http://localhost:5000';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function useWebRTC(localVideoRef, remoteVideoRef) {
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);

  /* ── helpers ── */
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
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        toast.error('Please enable camera & microphone.');
        return;
      }

      /* offer / answer / ice */
      socket.on('offer', async (offer) => {
        const pc = createPeer();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', answer);
      });

      socket.on('answer', async (answer) => {
        await peerRef.current?.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      });

      socket.on('ice-candidate', async (candidate) => {
        try {
          await peerRef.current?.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (err) {
          console.error('ICE error:', err);
        }
      });

      /* auto-call */
      const pc = createPeer();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', offer);
    })();

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.close();
      socket.disconnect();
    };
  }, [createPeer, localVideoRef]);

  /* ── controls ── */
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

  return { toggleMic, toggleCamera };
}
