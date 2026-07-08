import { useEffect, useRef } from "react";

/**
 * Calls `onIdle` after `timeoutMs` of no user activity.
 * Activity = mouse/keyboard/scroll/touch events, throttled so frequent
 * events (e.g. mousemove) don't thrash the timer.
 */
export function useIdleTimeout(onIdle, timeoutMs = 10 * 60 * 1000) {
  const callbackRef = useRef(onIdle);
  callbackRef.current = onIdle;

  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callbackRef.current(), timeoutMs);
    };

    let lastReset = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset > 5000) {
        lastReset = now;
        resetTimer();
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [timeoutMs]);
}