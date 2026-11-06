"use client";
import api from "@/lib/api";
import { createSocket } from "@/lib/socket";
import { mediaEnvironmentError, mediaErrorMessage } from "@/lib/media-errors";
import type { ChatMessage, DebateStatus, MatchedPayload, DebatePreferences, FormalDebateState } from "@/types";
import { DEFAULT_DEBATE_PREFERENCES } from "@/lib/debate-preferences";
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
  preferences: DebatePreferences = DEFAULT_DEBATE_PREFERENCES,
  initialStream: MediaStream | null = null,
) {
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const matchRef = useRef<string | null>(null);
  const iceRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef<RTCConfiguration>({ iceServers: [] });
  const searchRef = useRef(0);
  const searchingRef = useRef(false);
  const pausedRef = useRef(false);
  const awaitingReconnectRef = useRef(false);
  const effectVersionRef = useRef(0);
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [searchConfirmed, setSearchConfirmed] = useState(false);
  const micWantedRef = useRef(true);
  const maySpeakRef = useRef(preferences.mode !== 'formal');
  const [formalState, setFormalState] = useState<FormalDebateState | null>(null);
  const [countdownNow, setCountdownNow] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  useEffect(() => {
    if (!formalState || formalState.completed) return;
    const timer = setInterval(() => setCountdownNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [formalState]);
  const [status, setStatus] = useState<DebateStatus>("starting");
  const [peerName, setPeerName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const closePeer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (recoveryRef.current) clearTimeout(recoveryRef.current);
    recoveryRef.current = null;
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
    const effectVersion = ++effectVersionRef.current;
    const socket = createSocket();
    socketRef.current = socket;
    let cancelled = false;
    let offerer = false;
    let restartAttempted = false;
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
    const restartIce = async (pc: RTCPeerConnection, id: string) => {
      if (!active(pc, id) || restartAttempted) return;
      restartAttempted = true;
      setStatus("reconnecting");
      if (offerer) {
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          if (!active(pc, id)) return;
          await pc.setLocalDescription(offer);
          if (active(pc, id)) socket.emit("offer", { matchId: id, data: offer });
        } catch {
          fail(pc, "Video recovery failed. Check your connection and try another partner.");
          return;
        }
      } else {
        socket.emit("ice-restart-request", { matchId: id });
      }
      timeout(pc, 10_000);
    };
    const scheduleRecovery = (pc: RTCPeerConnection, id: string) => {
      if (!active(pc, id) || recoveryRef.current) return;
      recoveryRef.current = setTimeout(() => {
        recoveryRef.current = null;
        void restartIce(pc, id);
      }, 5_000);
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
      if (!cancelled && !pausedRef.current && !searchingRef.current && streamRef.current && socket.connected) {
        searchingRef.current = true;
        setSearchConfirmed(false);
        setSearchStartedAt(Date.now());
        setStatus("searching");
        socket.emit("find-partner", preferences);
      }
    };
    socket.on("connect", start);
    socket.on("connect_error", (err: Error) => {
      if (cancelled) return;
      setStatus("error");
      if (err.message === "Not authenticated") {
        toast.error("The debate server could not verify your login cookie. Check browser cookie permissions and try signing in again.");
      } else {
        toast.error("Cannot reach the debate server. Check your network or try again.");
      }
    });
    socket.on("disconnect", () => {
      if (cancelled) return;
      if (preferences.mode === 'formal') {
        maySpeakRef.current = false;
        const track = streamRef.current?.getAudioTracks()[0];
        if (track) track.enabled = false;
        setMicOn(false);
      }
      searchRef.current++;
      searchingRef.current = false;
      setSearchStartedAt(null);
      setSearchConfirmed(false);
      closePeer();
      setStatus(pausedRef.current ? "idle" : "reconnecting");
    });
    socket.on("account-restricted", ({ message }: { message: string }) => {
      searchingRef.current = false;
      pausedRef.current = true;
      socket.removeAllListeners('disconnect');
      closePeer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatus('error');
      toast.error(message);
      socket.disconnect();
    });
    socket.on("moderation-warning", ({ message }: { message: string }) => toast.warning(message));
    socket.on("waiting", () => {
      if (searchingRef.current && !pausedRef.current) {
        setSearchConfirmed(true);
        setStatus("searching");
      }
    });
    socket.on("formal-state", (state: FormalDebateState) => {
      if (cancelled || state.matchId !== matchRef.current) return;
      maySpeakRef.current = state.isSpeaker && !state.completed;
      const track = streamRef.current?.getAudioTracks()[0];
      const enabled = maySpeakRef.current && micWantedRef.current;
      if (track) track.enabled = enabled;
      setMicOn(enabled);
      setFormalState(state);
      setClockOffset(state.serverNow - Date.now());
      setCountdownNow(Date.now());
    });
    socket.on("peer-reconnecting", ({ matchId }: { matchId: string }) => {
      if (cancelled || (matchRef.current && matchId !== matchRef.current)) return;
      maySpeakRef.current = false;
      const track = streamRef.current?.getAudioTracks()[0];
      if (track) track.enabled = false;
      setMicOn(false);
      awaitingReconnectRef.current = true;
      closePeer();
      setStatus("reconnecting");
    });
    socket.on("formal-completed", ({ matchId }: { matchId: string }) => {
      if (cancelled || (matchRef.current && matchRef.current !== matchId)) return;
      maySpeakRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setMicOn(false);
      closePeer();
      setStatus("completed");
      setFormalState((previous) => previous ? { ...previous, completed: true } : null);
    });
    socket.on("debate-already-active", () => {
      searchingRef.current = false;
      setSearchStartedAt(null);
      setSearchConfirmed(false);
      setStatus("error");
      toast.error("You already have a debate open in another tab. Leave it before searching here.");
    });
    socket.on("session-revoked", () => {
      searchingRef.current = false;
      pausedRef.current = true;
      socket.removeAllListeners("disconnect");
      closePeer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatus("error");
      toast.error("You have logged out. Please sign in again.");
      socket.disconnect();
    });
    socket.on(
      "matched",
      async ({ matchId, initiator, peer }: MatchedPayload) => {
        if (cancelled) return;
        if (pausedRef.current || (!searchingRef.current && !awaitingReconnectRef.current)) {
          // A delayed match after cancelling must not start a call.
          socket.emit("leave");
          return;
        }
        searchingRef.current = false;
        awaitingReconnectRef.current = false;
        setSearchStartedAt(null);
        setSearchConfirmed(false);
        closePeer();
        offerer = initiator;
        restartAttempted = false;
        setFormalState(null);
        if (preferences.mode === 'formal') {
          maySpeakRef.current = false;
          const track = streamRef.current?.getAudioTracks()[0];
          if (track) track.enabled = false;
          setMicOn(false);
        }
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
            if (recoveryRef.current) clearTimeout(recoveryRef.current);
            recoveryRef.current = null;
            restartAttempted = false;
            setStatus("connected");
          } else if (pc.connectionState === "disconnected") {
            setStatus("reconnecting");
            scheduleRecovery(pc, matchId);
          } else if (pc.connectionState === "failed") {
            void restartIce(pc, matchId);
          }
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
    socket.on("ice-restart-request", ({ matchId }: { matchId: string }) => {
      const pc = peerRef.current;
      if (pc && offerer && active(pc, matchId)) void restartIce(pc, matchId);
    });
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
      searchingRef.current = false;
      setSearchStartedAt(null);
      setSearchConfirmed(false);
      setStatus("error");
      toast.error("Please accept the rules first.");
    });
    socket.on("search-error", ({ message }: { message?: string } = {}) => {
      if (pausedRef.current) return;
      searchingRef.current = false;
      setSearchStartedAt(null);
      setSearchConfirmed(false);
      setStatus("error");
      toast.error(message || "Could not search. Wait a few seconds and try again.");
    });
    socket.on("peer-left", () => {
      awaitingReconnectRef.current = false;
      searchingRef.current = false;
      setSearchStartedAt(null);
      setSearchConfirmed(false);
      if (preferences.mode === 'formal') {
        maySpeakRef.current = false;
        const track = streamRef.current?.getAudioTracks()[0];
        if (track) track.enabled = false;
        setMicOn(false);
      }
      setFormalState(null);
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
        const environmentError = mediaEnvironmentError();
        if (environmentError) {
          setStatus("error");
          toast.error(environmentError);
          return;
        }
        let config: { data: RTCConfiguration };
        try {
          config = await api.get<RTCConfiguration>("/auth/ice-servers", { silent: true });
        } catch (error) {
          if (cancelled) return;
          const statusCode = (error as { response?: { status?: number } })?.response?.status;
          setStatus("error");
          toast.error(
            statusCode === 401
              ? "The server is not receiving your login cookie. Please sign in again or check browser cookie settings."
              : "Could not load video connection settings. Check your connection and retry.",
          );
          return;
        }
        if (cancelled) return;
        configRef.current = config.data;
        let stream: MediaStream;
        try {
          stream = initialStream ?? await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (error) {
          if (!cancelled) {
            setStatus("error");
            toast.error(mediaErrorMessage(error));
          }
          return;
        }
        if (cancelled) {
          // The strict-mode effect replay may reuse an already handed-off stream.
          if (stream !== initialStream) stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        for (const track of stream.getTracks()) {
          track.onended = () => {
            if (cancelled || streamRef.current !== stream) return;
            socket.emit("leave");
            closePeer();
            setStatus("error");
            toast.error("Your camera or microphone disconnected. Reconnect it, then retry.");
          };
        }
        const enabled = preferences.mode !== 'formal' && micWantedRef.current;
        const audio = stream.getAudioTracks()[0];
        if (audio) audio.enabled = enabled;
        setMicOn(enabled);
        setCamOn(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        start();
      } catch {
        if (!cancelled) {
          setStatus("error");
          toast.error(
            "Could not initialize the debate. Check your internet connection and retry.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      const stream = streamRef.current;
      // Defer release one microtask: React dev StrictMode replays effects on
      // mount and must not destroy a transferred stream before setup resumes.
      if (stream) {
        stream.getTracks().forEach((track) => { track.onended = null; });
        queueMicrotask(() => {
          if (effectVersionRef.current !== effectVersion) return;
          stream.getTracks().forEach((track) => track.stop());
          if (streamRef.current === stream) streamRef.current = null;
        });
      }
      closePeer();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [closePeer, localVideoRef, remoteVideoRef, preferences, initialStream]);
  const cancelSearch = useCallback(() => {
    pausedRef.current = true;
    awaitingReconnectRef.current = false;
    searchingRef.current = false;
    searchRef.current++;
    socketRef.current?.emit("leave");
    closePeer();
    setSearchStartedAt(null);
    setSearchConfirmed(false);
    setStatus("idle");
  }, [closePeer]);

  const findNext = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket?.connected || !streamRef.current) {
      toast.error(
        "Check your connection and camera permissions, then refresh.",
      );
      return;
    }
    const version = ++searchRef.current;
    pausedRef.current = false;
    awaitingReconnectRef.current = false;
    searchingRef.current = false;
    socket.emit("leave");
    closePeer();
    setMessages([]);
    setPeerName("");
    setStatus("starting");
    setFormalState(null);
    maySpeakRef.current = preferences.mode !== 'formal';
    const audio = streamRef.current?.getAudioTracks()[0];
    if (audio) audio.enabled = preferences.mode !== 'formal' && micWantedRef.current;
    try {
      const config = await api.get<RTCConfiguration>("/auth/ice-servers");
      if (
        socketRef.current !== socket ||
        !socket.connected ||
        version !== searchRef.current
      )
        return;
      configRef.current = config.data;
      searchingRef.current = true;
      setSearchStartedAt(Date.now());
      setSearchConfirmed(false);
      setStatus("searching");
      socket.emit("find-partner", preferences);
    } catch {
      if (version === searchRef.current) {
        searchingRef.current = false;
        setSearchStartedAt(null);
        setStatus("error");
      }
    }
  }, [closePeer, preferences]);
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
    setFormalState(null);
    maySpeakRef.current = false;
    const audio = streamRef.current?.getAudioTracks()[0];
    if (audio) audio.enabled = false;
    setMicOn(false);
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
    if (!maySpeakRef.current) return;
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      micWantedRef.current = !micWantedRef.current;
      track.enabled = micWantedRef.current;
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
    searchStartedAt,
    searchConfirmed,
    cancelSearch,
    retrySearch: findNext,
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
    formalState,
    maySpeak: preferences.mode !== 'formal' || (formalState?.isSpeaker === true && !formalState.completed),
    debateRemainingMs: formalState ? Math.max(0, formalState.endsAt - (countdownNow + clockOffset)) : null,
    turnRemainingMs: formalState ? Math.max(0, formalState.turnEndsAt - (countdownNow + clockOffset)) : null,
  };
}
