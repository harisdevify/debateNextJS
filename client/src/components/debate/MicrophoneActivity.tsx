'use client';

import { useEffect, useRef, useState } from 'react';

export function MicrophoneActivity({ stream, enabled }: { stream: MediaStream; enabled: boolean }) {
  const [level, setLevel] = useState(0);
  const contextRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    const track = stream.getAudioTracks()[0];
    if (!enabled || !track || track.readyState !== 'live' || typeof AudioContext === 'undefined') return;
    let frame = 0;
    let active = true;
    let context: AudioContext | null = null;
    try {
      context = new AudioContext();
      contextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser); // Never connect to destination; avoid audio feedback.
      const samples = new Uint8Array(analyser.frequencyBinCount);
      let lastSample = 0;
      const tick = (time: number) => {
        if (!active) return;
        // Sampling at ~10 Hz avoids a full React render every animation frame.
        if (time - lastSample >= 100) {
          lastSample = time;
          analyser.getByteFrequencyData(samples);
          const energy = samples.reduce((total, sample) => total + sample, 0) / samples.length;
          setLevel(Math.min(100, Math.round(energy / 1.2)));
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    } catch {
      // AudioContext may be blocked by browser autoplay policy.
      void context?.close();
    }
    return () => {
      active = false;
      if (frame) cancelAnimationFrame(frame);
      if (contextRef.current === context) contextRef.current = null;
      void context?.close();
    };
  }, [stream, enabled]);
  return (
    <div className="flex items-center gap-2 text-xs text-white/65" aria-label={enabled ? 'Microphone activity' : 'Microphone inactive'}>
      <span className="font-medium">{enabled ? 'Mic' : 'Muted'}</span>
      <div aria-hidden="true" className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${enabled ? level : 0}%` }} />
      </div>
    </div>
  );
}
