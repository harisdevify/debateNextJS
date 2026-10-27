"use client";
import api from "@/lib/api";
import { createSocket } from "@/lib/socket";
import type { ChatMessage, DebateStatus, MatchedPayload } from "@/types";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";
interface Ack {
  ok: boolean;
  message?: string;
}
interface Signal<T> {
  matchId: string;
  data: T;
}
export function useDebateRoom(
  localVideoRef: RefObject<HTMLVideoElement | null>,
  remoteVideoRef: RefObject<HTMLVideoElement | null>,
) {
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const matchRef = useRef<string | null>(null);
  const iceRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef<RTCConfiguration>({ iceServers: [] });
  const searchRef = useRef(0);
  const [status, setStatus] = useState<DebateStatus>("starting");
  const [peerName, setPeerName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const closePeer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const pc = peerRef.current;
    peerRef.current = null;
    matchRef.current = null;
    if (pc) {
      pc.onconnectionstatechange = null;
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
    }
    iceRef.current = [];
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, [remoteVideoRef]);
  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;
    let cancelled = false;
    let searching = false;
    const active = (pc: RTCPeerConnection, id: string) =>
      !cancelled && peerRef.current === pc && matchRef.current === id;
    const fail = (pc: RTCPeerConnection, message: string) => {
      if (cancelled || peerRef.current !== pc) return;
      socket.emit("leave");
      closePeer();
      setStatus("error");
      toast.error(message);
    };
    const timeout = (pc: RTCPeerConnection, ms: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(
        () => fail(pc, "Video connection timed out. Try another partner."),
        ms,
      );
    };
    const flushIce = async (pc: RTCPeerConnection, id: string) => {
      const queued = iceRef.current;
      iceRef.current = [];
      for (const candidate of queued) {
        if (!active(pc, id)) return;
        await pc.addIceCandidate(candidate);
      }
    };
    const start = () => {
      if (!cancelled && !searching && streamRef.current && socket.connected) {
        searching = true;
        setStatus("searching");
        socket.emit("find-partner");
      }
    };
    socket.on("connect", start);
    socket.on("connect_error", (err: Error) => {
      if (cancelled) return;
      setStatus("error");
      toast.error(
        err.message === "Not authenticated"
          ? "Please login again."
          : "Cannot reach the debate server.",
      );
    });
    socket.on("disconnect", () => {
      if (cancelled) return;
      searchRef.current++;
      searching = false;
      closePeer();
      setStatus("reconnecting");
    });
    socket.on("waiting", () => setStatus("searching"));
    socket.on(
      "matched",
      async ({ matchId, initiator, peer }: MatchedPayload) => {
        if (cancelled) return;
        closePeer();
        matchRef.current = matchId;
        setMessages([]);
        setPeerName(peer?.fullname || "");
        setStatus("connecting");
        const pc = new RTCPeerConnection(configRef.current);
        peerRef.current = pc;
        const local = streamRef.current;
        local?.getTracks().forEach((track) => pc.addTrack(track, local));
        pc.ontrack = (event) => {
          if (active(pc, matchId) && remoteVideoRef.current)
            remoteVideoRef.current.srcObject = event.streams[0];
        };
        pc.onicecandidate = (event) => {
          if (active(pc, matchId) && event.candidate)
            socket.emit("ice-candidate", { matchId, data: event.candidate });
        };
        pc.onconnectionstatechange = () => {
          if (!active(pc, matchId)) return;
          if (pc.connectionState === "connected") {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = null;
            setStatus("connected");
          } else if (pc.connectionState === "disconnected") {
            setStatus("reconnecting");
            timeout(pc, 10_000);
          } else if (pc.connectionState === "failed")
            fail(
              pc,
              "Video connection failed. Try another partner or check your network.",
            );
        };
        timeout(pc, 30_000);
        try {
          if (initiator) {
            const offer = await pc.createOffer();
            if (!active(pc, matchId)) return;
            await pc.setLocalDescription(offer);
            if (active(pc, matchId))
              socket.emit("offer", { matchId, data: offer });
          }
        } catch {
          fail(pc, "Could not start the video connection.");
        }
      },
    );
    socket.on(
      "offer",
      async ({ matchId, data }: Signal<RTCSessionDescriptionInit>) => {
        const pc = peerRef.current;
        if (!pc || !active(pc, matchId)) return;
        try {
          await pc.setRemoteDescription(data);
          if (!active(pc, matchId)) return;
          await flushIce(pc, matchId);
          if (!active(pc, matchId)) return;
          const answer = await pc.createAnswer();
          if (!active(pc, matchId)) return;
          await pc.setLocalDescription(answer);
          if (active(pc, matchId))
            socket.emit("answer", { matchId, data: answer });
        } catch {
          fail(pc, "Could not negotiate the video connection.");
        }
      },
    );
    socket.on(
      "answer",
      async ({ matchId, data }: Signal<RTCSessionDescriptionInit>) => {
        const pc = peerRef.current;
        if (!pc || !active(pc, matchId)) return;
        try {
          await pc.setRemoteDescription(data);
          if (active(pc, matchId)) await flushIce(pc, matchId);
        } catch {
          fail(pc, "Could not negotiate the video connection.");
        }
      },
    );
    socket.on(
      "ice-candidate",
      async ({ matchId, data }: Signal<RTCIceCandidateInit>) => {
        const pc = peerRef.current;
        if (!pc || !active(pc, matchId)) return;
        if (!pc.remoteDescription) {
          if (iceRef.current.length < 256) iceRef.current.push(data);
          return;
        }
        try {
          await pc.addIceCandidate(data);
        } catch {
          fail(pc, "Could not establish the video connection.");
        }
      },
    );
    socket.on("rules-required", () => {
      setStatus("error");
      toast.error("Please accept the rules first.");
    });
    socket.on("search-error", () => {
      setStatus("error");
      toast.error("Could not search. Wait a few seconds and try again.");
    });
    socket.on("peer-left", () => {
      closePeer();
      setStatus("peer-left");
      toast.info("Your partner left the debate.");
    });
    socket.on(
      "chatMessage",
      ({ text, matchId }: { text: string; matchId: string }) => {
        if (matchId === matchRef.current)
          setMessages((prev) => [
            ...prev.slice(-499),
            { id: crypto.randomUUID(), text, sender: "other" },
          ]);
      },
    );
    void (async () => {
      try {
        const config = await api.get<RTCConfiguration>("/auth/ice-servers");
        if (cancelled) return;
        configRef.current = config.data;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setMicOn(true);
        setCamOn(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        start();
      } catch {
        if (!cancelled) {
          setStatus("error");
          toast.error(
            "Could not start. Check your session, camera and microphone permissions.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      closePeer();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [closePeer, localVideoRef, remoteVideoRef]);
  const findNext = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket?.connected || !streamRef.current) {
      toast.error(
        "Check your connection and camera permissions, then refresh.",
      );
      return;
    }
    const version = ++searchRef.current;
    socket.emit("leave");
    closePeer();
    setMessages([]);
    setPeerName("");
    setStatus("starting");
    try {
      const config = await api.get<RTCConfiguration>("/auth/ice-servers");
      if (
        socketRef.current !== socket ||
        !socket.connected ||
        version !== searchRef.current
      )
        return;
      configRef.current = config.data;
      setStatus("searching");
      socket.emit("find-partner");
    } catch {
      if (version === searchRef.current) setStatus("error");
    }
  }, [closePeer]);
  const emitWithAck = useCallback(
    async (event: string, payload?: unknown): Promise<Ack> => {
      const socket = socketRef.current;
      if (!socket?.connected)
        return { ok: false, message: "You are not connected." };
      try {
        return (await socket
          .timeout(5000)
          .emitWithAck(
            event,
            ...(payload === undefined ? [] : [payload]),
          )) as Ack;
      } catch {
        return {
          ok: false,
          message:
            "The server did not answer. Delivery is unconfirmed; check before retrying.",
        };
      }
    },
    [],
  );
  const reportPartner = useCallback(
    async (reason: string, details: string) => {
      const res = await emitWithAck("report-partner", { reason, details });
      if (res.ok)
        toast.success("Report sent. Thank you for keeping the platform safe.");
      else toast.error(res.message ?? "Could not send the report.");
      return res.ok;
    },
    [emitWithAck],
  );
  const blockPartner = useCallback(async () => {
    const res = await emitWithAck("block-partner");
    if (!res.ok) {
      toast.error(res.message ?? "Could not block this user.");
      return false;
    }
    searchRef.current++;
    closePeer();
    setMessages([]);
    setPeerName("");
    setStatus("blocked");
    toast.success("User blocked.");
    return true;
  }, [emitWithAck, closePeer]);
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      if (trimmed.length > 1000) {
        toast.error("Use at most 1000 characters.");
        return false;
      }
      const matchId = matchRef.current;
      if (status !== "connected" || !matchId) {
        toast.info("Wait until a partner connects to chat.");
        return false;
      }
      const res = await emitWithAck("chatMessage", { text: trimmed, matchId });
      if (!res.ok) {
        toast.error(res.message ?? "Could not send your message.");
        return false;
      }
      if (matchRef.current === matchId)
        setMessages((prev) => [
          ...prev.slice(-499),
          { id: crypto.randomUUID(), text: trimmed, sender: "me" },
        ]);
      return true;
    },
    [status, emitWithAck],
  );
  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };
  const toggleCamera = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
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
    micOn,
    camOn,
  };
}
