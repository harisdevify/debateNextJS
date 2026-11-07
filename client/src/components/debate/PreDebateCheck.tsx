'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CameraOff, CheckCircle2, Mic, RefreshCw, ShieldCheck } from 'lucide-react';
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold uppercase tracking-[0.12em] text-primary">Ready to connect</span>
          <span className="text-white/50">Step 4 of 4</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Conversation setup progress">
          {['Topic', 'Language', 'Style', 'Devices'].map((label, index) => (
            <div key={label} className="min-w-0">
              <div className={`h-1.5 rounded-full ${index <= 3 ? 'bg-primary' : 'bg-white/15'}`} />
              <span className={`mt-2 hidden text-[11px] sm:block ${index === 3 ? 'font-semibold text-white' : 'text-white/40'}`}>{index < 3 ? '✓ ' : ''}{label}</span>
            </div>
          ))}
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Check your camera and microphone</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
          Make sure everything works before connecting with your debate partner.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)] lg:gap-5">
        <section aria-label="Local camera preview" className="min-w-0 overflow-hidden rounded-2xl border border-white/12 bg-[#111b19]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Camera preview</h2>
              <p className="mt-0.5 text-xs text-white/45">Visible only to you</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${phase === 'ready' ? 'border-primary/25 bg-primary/10 text-primary' : 'border-white/12 bg-white/5 text-white/55'}`}>
              <span className={`size-1.5 rounded-full ${phase === 'ready' ? 'bg-primary' : 'bg-white/40'}`} />
              {phase === 'ready' ? 'Ready' : phase === 'loading' ? 'Connecting…' : 'Not connected'}
            </span>
          </div>
          <div className="relative aspect-video w-full overflow-hidden bg-[#070c0b]">
            <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview"
              className={`absolute inset-0 size-full object-cover ${phase === 'ready' ? '' : 'opacity-20'}`} />
            {phase !== 'ready' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center text-white/50">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5"><CameraOff size={22} aria-hidden="true" /></span>
                <p className="text-sm">{phase === 'loading' ? 'Connecting to your camera…' : 'Your preview will appear here'}</p>
              </div>
            )}
            {phase === 'ready' && (
              <span className="absolute bottom-3 left-3 rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-xs text-white/85">You · Local preview</span>
            )}
          </div>
          <div className="flex items-start gap-2.5 border-t border-white/10 px-4 py-3 text-xs leading-5 text-white/55">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            Your camera and microphone stay private until a debate connection begins.
          </div>
        </section>

        <section aria-labelledby="device-settings-title" className="min-w-0 rounded-2xl border border-white/12 bg-[#111b19] p-4 sm:p-5">
          <h2 id="device-settings-title" className="text-base font-semibold text-white">Audio & video settings</h2>
          <p className="mt-1 text-xs leading-5 text-white/50">Choose which devices to use for your conversation.</p>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                <Camera size={15} className="text-primary" aria-hidden="true" /> Camera
              </div>
              <AppSelect aria-label="Camera" id="debate-camera" value={camera} disabled={phase === 'loading' || !cameraDevices.length}
                onChange={(event) => void acquire(event.target.value, microphone)}>
                {!cameraDevices.length && <option value={camera}>Enable preview to detect cameras</option>}
                {cameraDevices.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${i + 1}`}</option>)}
              </AppSelect>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                <Mic size={15} className="text-primary" aria-hidden="true" /> Microphone
              </div>
              <AppSelect aria-label="Microphone" id="debate-mic" value={microphone} disabled={phase === 'loading' || !micDevices.length}
                onChange={(event) => void acquire(camera, event.target.value)}>
                {!micDevices.length && <option value={microphone}>Enable preview to detect microphones</option>}
                {micDevices.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${i + 1}`}</option>)}
              </AppSelect>
            </div>
          </div>

          <div role="status" aria-live="polite" className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs leading-5">
            {error ? (
              <span className="text-amber-200">{error}</span>
            ) : phase === 'ready' ? (
              <span className="flex items-center gap-2 text-primary"><CheckCircle2 size={16} aria-hidden="true" /> Camera and microphone are ready</span>
            ) : (
              <span className="text-white/55">{phase === 'loading' ? 'Checking your devices…' : 'Enable your devices to continue.'}</span>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {phase !== 'ready' ? (
              <button type="button" disabled={phase === 'loading'} onClick={() => void acquire()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                <Camera size={16} aria-hidden="true" /> {phase === 'loading' ? 'Checking devices…' : 'Enable camera & microphone'}
              </button>
            ) : (
              <button type="button" onClick={join}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary-hover">
                Find a debate partner <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
            {phase === 'ready' && (
              <button type="button" onClick={() => void acquire()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-sm text-white/70 hover:bg-white/5">
                <RefreshCw size={15} aria-hidden="true" /> Recheck devices
              </button>
            )}
            <button type="button" onClick={onBack}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white">
              <ArrowLeft size={15} aria-hidden="true" /> Back to preferences
            </button>
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/50">
        <span className="font-medium text-white/70">Your choices:</span>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5">{summary}</span>
      </div>
    </main>
  );
}
