import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useDebateRoom } from "./useDebateRoom";
import type { DebatePreferences } from "@/types";
const mocks = vi.hoisted(() => ({
  handlers: {} as Record<string, (...args: never[]) => unknown>,
  emit: vi.fn(),
  ack: vi.fn(),
  get: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ default: { get: mocks.get } }));
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));
vi.mock("@/lib/socket", () => ({
  createSocket: () => ({
    connected: true,
    on: (event: string, fn: (...args: never[]) => unknown) => {
      mocks.handlers[event] = fn;
    },
    emit: mocks.emit,
    timeout: () => ({ emitWithAck: mocks.ack }),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
  }),
}));
class Peer {
  static instances: Peer[] = [];
  connectionState = "new";
  remoteDescription: unknown = null;
  onconnectionstatechange: (() => void) | null = null;
  ontrack = null;
  onicecandidate = null;
  addTrack = vi.fn();
  close = vi.fn();
  createOffer = vi.fn(async (_options?: RTCOfferOptions) => ({ type: "offer", sdp: "offer" }));
  createAnswer = vi.fn(async () => ({ type: "answer", sdp: "answer" }));
  setLocalDescription = vi.fn(async () => {});
  setRemoteDescription = vi.fn(async (data) => {
    this.remoteDescription = data;
  });
  addIceCandidate = vi.fn(async () => {});
  constructor() {
    Peer.instances.push(this);
  }
}
const fire = async (event: string, payload?: unknown) => {
  await act(async () => {
    await mocks.handlers[event](payload as never);
  });
};
const setup = async (preferences?: DebatePreferences) => {
  const local = { current: document.createElement("video") };
  const remote = { current: document.createElement("video") };
  const hook = renderHook(() => useDebateRoom(local, remote, preferences));
  await waitFor(() => expect(mocks.emit).toHaveBeenCalledWith("find-partner", preferences ?? {
    topic: "religion", language: "en", mode: "friendly",
  }));
  return hook;
};
beforeEach(() => {
  Peer.instances = [];
  mocks.handlers = {};
  mocks.get.mockResolvedValue({ data: { iceServers: [] } });
  mocks.ack.mockResolvedValue({ ok: true });
  vi.stubGlobal("RTCPeerConnection", Peer);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: mocks.stop }],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
      })),
    },
  });
});
it("does not show connected until WebRTC connects; handles failed transport", async () => {
  const { result } = await setup();
  await fire("matched", { matchId: "first", initiator: true });
  expect(result.current.status).toBe("connecting");
  const pc = Peer.instances[0];
  act(() => {
    pc.connectionState = "connected";
    pc.onconnectionstatechange?.();
  });
  expect(result.current.status).toBe("connected");
  act(() => {
    pc.connectionState = "disconnected";
    pc.onconnectionstatechange?.();
  });
  expect(result.current.status).toBe("reconnecting");
  act(() => {
    pc.connectionState = "failed";
    pc.onconnectionstatechange?.();
  });
  expect(result.current.status).toBe("reconnecting");
  expect(pc.createOffer).toHaveBeenCalledWith({ iceRestart: true });
  expect(pc.close).not.toHaveBeenCalled();
});
it("ignores signaling belonging to a previous partner", async () => {
  const { result } = await setup();
  await fire("matched", { matchId: "old", initiator: false });
  await act(async () => { await result.current.findNext(); });
  await fire("matched", { matchId: "new", initiator: false });
  await fire("offer", {
    matchId: "old",
    data: { type: "offer", sdp: "stale" },
  });
  expect(Peer.instances[1].setRemoteDescription).not.toHaveBeenCalled();
  expect(Peer.instances[0].close).toHaveBeenCalled();
});
it("does not display rejected chat as sent and validates length", async () => {
  const { result } = await setup();
  await fire("matched", { matchId: "first", initiator: false });
  act(() => {
    const pc = Peer.instances[0];
    pc.connectionState = "connected";
    pc.onconnectionstatechange?.();
  });
  mocks.ack.mockResolvedValue({ ok: false, message: "Rate limited" });
  await act(async () => {
    expect(await result.current.sendMessage("hello")).toBe(false);
  });
  expect(result.current.messages).toHaveLength(0);
  mocks.ack.mockResolvedValue({ ok: true });
  await act(async () => {
    expect(await result.current.sendMessage("hello")).toBe(true);
  });
  expect(result.current.messages[0].text).toBe("hello");
  mocks.ack.mockClear();
  await act(async () => {
    expect(await result.current.sendMessage("x".repeat(1001))).toBe(false);
  });
  expect(mocks.ack).not.toHaveBeenCalled();
});
it("stops camera tracks and closes the peer on unmount", async () => {
  const { unmount } = await setup();
  await fire("matched", { matchId: "first", initiator: false });
  unmount();
  await waitFor(() => expect(mocks.stop).toHaveBeenCalled());
  expect(Peer.instances[0].close).toHaveBeenCalled();
});

it("sends selected preferences for initial search and Next", async () => {
  const preferences: DebatePreferences = { topic: "technology", language: "ur", mode: "formal" };
  const { result } = await setup(preferences);
  expect(mocks.emit).toHaveBeenCalledWith("find-partner", preferences);
  await act(async () => { await result.current.findNext(); });
  expect(mocks.emit).toHaveBeenLastCalledWith("find-partner", preferences);
});

it("enforces non-speaker audio mute and restores only on an authorized turn", async () => {
  const audio = { enabled: true, stop: vi.fn() };
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
    getUserMedia: vi.fn(async () => ({ getTracks: () => [audio], getAudioTracks: () => [audio], getVideoTracks: () => [] })),
  } });
  const preferences: DebatePreferences = { topic: "science", language: "en", mode: "formal" };
  const { result } = await setup(preferences);
  expect(audio.enabled).toBe(false);
  await fire("matched", { matchId: "formal-1", initiator: false });
  const state = { matchId: "formal-1", serverNow: Date.now(), startedAt: Date.now(), endsAt: Date.now() + 600000,
    turnEndsAt: Date.now() + 120000, turnNumber: 1, isSpeaker: false, completed: false };
  await fire("formal-state", state);
  expect(result.current.maySpeak).toBe(false);
  expect(audio.enabled).toBe(false);
  act(() => result.current.toggleMic());
  expect(audio.enabled).toBe(false);
  await fire("formal-state", { ...state, isSpeaker: true, turnNumber: 2 });
  expect(result.current.maySpeak).toBe(true);
  expect(audio.enabled).toBe(true);
  act(() => result.current.toggleMic());
  expect(audio.enabled).toBe(false);
  await fire("formal-state", { ...state, isSpeaker: false, turnNumber: 3 });
  await fire("formal-state", { ...state, isSpeaker: true, turnNumber: 4 });
  expect(audio.enabled).toBe(false);
  await fire("formal-completed", { matchId: "formal-1" });
  expect(result.current.status).toBe("completed");
  expect(audio.stop).toHaveBeenCalled();
});

it("restarts ICE once when the peer connection fails", async () => {
  const { result } = await setup();
  await fire("matched", { matchId: "recovery", initiator: true });
  const pc = Peer.instances[0];
  await act(async () => {
    pc.connectionState = "failed";
    pc.onconnectionstatechange?.();
  });
  expect(pc.createOffer).toHaveBeenCalledWith({ iceRestart: true });
  expect(result.current.status).toBe("reconnecting");
});
it("non-offerer requests a peer ICE restart rather than creating its own offer", async () => {
  await setup();
  await fire("matched", { matchId: "recovery-2", initiator: false });
  const pc = Peer.instances[0];
  act(() => {
    pc.connectionState = "failed";
    pc.onconnectionstatechange?.();
  });
  expect(mocks.emit).toHaveBeenCalledWith("ice-restart-request", { matchId: "recovery-2" });
  expect(pc.createOffer).not.toHaveBeenCalled();
});

it("cancels waiting without releasing media, ignores a delayed match, and resumes by retrying", async () => {
  const { result } = await setup();
  expect(result.current.searchStartedAt).not.toBeNull();
  await act(async () => result.current.cancelSearch());
  expect(result.current.status).toBe("idle");
  expect(result.current.searchStartedAt).toBeNull();
  expect(mocks.emit).toHaveBeenCalledWith("leave");
  expect(mocks.stop).not.toHaveBeenCalled();
  await fire("waiting");
  expect(result.current.status).toBe("idle");
  await fire("matched", { matchId: "late", initiator: true });
  expect(Peer.instances).toHaveLength(0);
  await act(async () => { await result.current.retrySearch(); });
  expect(result.current.status).toBe("searching");
  expect(mocks.emit).toHaveBeenLastCalledWith("find-partner", { topic: "religion", language: "en", mode: "friendly" });
  await fire("waiting");
  expect(result.current.searchConfirmed).toBe(true);
});
it("preserves a formal debate while the peer reconnects", async () => {
  const pref: DebatePreferences = { topic: "science", language: "en", mode: "formal" };
  const { result } = await setup(pref);
  await fire("matched", { matchId: "formal-1", initiator: false });
  expect(Peer.instances).toHaveLength(1);
  await fire("peer-reconnecting", { matchId: "formal-1" });
  expect(result.current.status).toBe("reconnecting");
  await fire("matched", { matchId: "formal-1", initiator: false });
  expect(Peer.instances).toHaveLength(2);
  expect(result.current.status).toBe("connecting");
});
it("uses a handed-off preview stream instead of asking permission twice", async () => {
  const track = { stop: vi.fn(), enabled: true, getAudioTracks: vi.fn() };
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [],
    getAudioTracks: () => [],
  } as unknown as MediaStream;
  const local = { current: document.createElement("video") };
  const remote = { current: document.createElement("video") };
  const getUserMedia = vi.spyOn(navigator.mediaDevices, "getUserMedia");
  const hook = renderHook(() => useDebateRoom(local, remote, { topic: "religion", language: "en", mode: "friendly" }, stream));
  await waitFor(() => expect(mocks.emit).toHaveBeenCalledWith("find-partner", { topic: "religion", language: "en", mode: "friendly" }));
  expect(getUserMedia).not.toHaveBeenCalled();
  hook.unmount();
  await waitFor(() => expect(track.stop).toHaveBeenCalled());
  getUserMedia.mockRestore();
});
