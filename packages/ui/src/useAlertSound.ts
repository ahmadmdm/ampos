"use client";
import { useRef, useCallback } from "react";

/**
 * useAlertSound — plays a notification beep using Web Audio API.
 * No external audio files needed.
 */
export function useAlertSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastPlayRef = useRef(0);

  const play = useCallback((freq = 880, duration = 0.25, repeat = 2) => {
    // Debounce: don't play if last play was < 1s ago
    const now = Date.now();
    if (now - lastPlayRef.current < 1000) return;
    lastPlayRef.current = now;

    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;

      for (let i = 0; i < repeat; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * (duration + 0.1));
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * (duration + 0.1) + duration);

        osc.start(ctx.currentTime + i * (duration + 0.1));
        osc.stop(ctx.currentTime + i * (duration + 0.1) + duration);
      }
    } catch {
      // Silently fail if AudioContext is not available
    }
  }, []);

  return play;
}
