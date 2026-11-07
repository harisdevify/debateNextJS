'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, Mic, RefreshCw, ShieldCheck } from 'lucide-react';
import type { DebatePreferences } from '@/types';
import { DEBATE_LANGUAGES, DEBATE_MODES, DEBATE_TOPICS } from '@/lib/debate-preferences';
import { mediaEnvironmentError, mediaErrorMessage } from '@/lib/media-errors';
import { AppSelect } from '@/components/ui/AppSelect';

type Phase = 'idle' | 'loading' | 'ready' | 'error';

interface Props {
  preferences: DebatePreferences;
  onBack: () => void;
  onJoin: (stream: MediaStream) => void;
}

export function PreDebateCheck({ preferences, onBack, onJoin }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ownedStream = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const requestId = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [camera, setCamera] = useState('');
  const [microphone, setMicrophone] = useState('');

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current++;
      ownedStream.current?.getTracks().forEach((track) => track.stop());
      ownedStream.current = null;
    };
  }, []);

  const acquire = async (videoId = camera, audioId = microphone) => {
    const environmentError = mediaEnvironmentError();
    if (environmentError) {
      setPhase('error');
      setError(environmentError);
      return;
    }
    const currentRequest = ++requestId.current;
    setPhase('loading');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoId ? { deviceId: { exact: videoId } } : true,
        audio: audioId ? { deviceId: { exact: audioId } } : true,
      });
      if (!mounted.current || currentRequest !== requestId.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const previous = ownedStream.current;
      ownedStream.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      previous?.getTracks().forEach((track) => track.stop());
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      setCamera(videoTrack?.getSettings().deviceId ?? videoId);
      setMicrophone(audioTrack?.getSettings().deviceId ?? audioId);
      setPhase('ready');
      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const found = await navigator.mediaDevices.enumerateDevices();
          if (mounted.current && currentRequest === requestId.current) setDevices(found);
        } catch {
          // Device list is optional; a working preview still permits joining.
        }
      }
    } catch (cause) {
      if (!mounted.current || currentRequest !== requestId.current) return;
      // Keep an existing working stream when a device switch is rejected.
      setError(mediaErrorMessage(cause));
      setPhase(ownedStream.current ? 'ready' : 'error');
    }
  };

  const join = () => {
    const stream = ownedStream.current;
    if (!stream || !stream.getAudioTracks().some((t) => t.readyState === 'live') ||
        !stream.getVideoTracks().some((t) => t.readyState === 'live')) {
      setError('Camera and microphone must both be available before joining.');
      setPhase('error');
      return;
    }
    // Ownership is transferred to the debate hook. Unmount must not stop it.
    ownedStream.current = null;
    onJoin(stream);
  };

  const cameraDevices = devices.filter((device) => device.kind === 'videoinput');
  const micDevices = devices.filter((device) => device.kind === 'audioinput');
  const summary = [
    DEBATE_TOPICS.find((item) => item.value === preferences.topic)?.label,
    DEBATE_LANGUAGES.find((item) => item.value === preferences.language)?.label,
    DEBATE_MODES.find((item) => item.value === preferences.mode)?.label,
  ].filter(Boolean).join(' · ');

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Step 4 of 4 · Device check</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Ready for your conversation?</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Check your camera and microphone before searching. Your match will not start until you join.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0f1817]">
          <div className="relative flex min-h-64 aspect-video items-center justify-center overflow-hidden bg-[#0a1210]">
            <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" className={`absolute inset-0 size-full object-cover ${phase === 'ready' ? '' : 'opacity-30'}`} />
            {phase !== 'ready' && <div className="relative z-10 flex flex-col items-center gap-3 text-white/55">
              <CameraOff size={30} />
              <span className="text-sm">{phase === 'loading' ? 'Requesting camera and microphone…' : 'Preview is not active'}</span>
            </div>}
            {phase === 'ready' && <div className="absolute bottom-4 left-4 rounded-lg bg-black/65 px-3 py-1.5 text-xs text-white">Camera preview · Only you can see this</div>}
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-sm text-white/65">
            <ShieldCheck size={16} className="text-primary" /> Your media stays local until you match.
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-white/15 bg-[#111e1a] p-5 sm:p-6">
          <h2 className="font-semibold text-white">Your setup</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">{summary}</p>
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="debate-camera" className="mb-2 flex items-center gap-2 text-sm font-medium text-white"><Camera size={16} /> Camera</label>
              <AppSelect id="debate-camera" value={camera} disabled={phase === 'loading' || !cameraDevices.length}
                onChange={(event) => void acquire(event.target.value, microphone)}
                >
                {!cameraDevices.length && <option value={camera}>Enable preview to detect cameras</option>}
                {cameraDevices.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${i + 1}`}</option>)}
              </AppSelect>
            </div>
            <div>
              <label htmlFor="debate-mic" className="mb-2 flex items-center gap-2 text-sm font-medium text-white"><Mic size={16} /> Microphone</label>
              <AppSelect id="debate-mic" value={microphone} disabled={phase === 'loading' || !micDevices.length}
                onChange={(event) => void acquire(camera, event.target.value)}
                >
                {!micDevices.length && <option value={microphone}>Enable preview to detect microphones</option>}
                {micDevices.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${i + 1}`}</option>)}
              </AppSelect>
            </div>
          </div>
          <div role="status" className="mt-5 min-h-6 text-sm">
            {phase === 'ready' && !error && <span className="flex items-center gap-2 text-primary"><CheckCircle2 size={17} /> Camera and microphone ready</span>}
            {error && <span className="text-amber-300">{error}</span>}
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {phase !== 'ready'
              ? <button type="button" disabled={phase === 'loading'} onClick={() => void acquire()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-background disabled:opacity-60"><Camera size={18}/>{phase === 'loading' ? 'Checking devices…' : 'Enable camera & microphone'}</button>
              : <button type="button" onClick={join} className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-background">Find a debate partner</button>}
            {phase === 'ready' && <button type="button" onClick={() => void acquire()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm text-white/75"><RefreshCw size={15} /> Recheck devices</button>}
            <button type="button" onClick={onBack} className="min-h-11 rounded-xl px-4 text-sm font-medium text-white/60 hover:bg-white/5">Back to preferences</button>
          </div>
        </div>
      </div>
    </main>
  );
}
