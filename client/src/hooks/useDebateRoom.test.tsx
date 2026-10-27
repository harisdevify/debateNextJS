import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useDebateRoom } from "./useDebateRoom";
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
  createOffer = vi.fn(async () => ({ type: "offer", sdp: "offer" }));
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
const setup = async () => {
  const local = { current: document.createElement("video") };
  const remote = { current: document.createElement("video") };
  const hook = renderHook(() => useDebateRoom(local, remote));
  await waitFor(() => expect(mocks.emit).toHaveBeenCalledWith("find-partner"));
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
  expect(result.current.status).toBe("error");
  expect(pc.close).toHaveBeenCalled();
  expect(mocks.emit).toHaveBeenCalledWith("leave");
});
it("ignores signaling belonging to a previous partner", async () => {
  await setup();
  await fire("matched", { matchId: "old", initiator: false });
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
  expect(mocks.stop).toHaveBeenCalled();
  expect(Peer.instances[0].close).toHaveBeenCalled();
});
