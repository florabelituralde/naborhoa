import React, { useRef, useState, useCallback } from "react";
import { RefreshCw, ArrowDown } from "lucide-react";

const THRESHOLD = 70;   // px pulled before a refresh triggers
const MAX_PULL = 110;   // visual cap on how far the indicator travels

// Touch-based pull-to-refresh wrapper. Only reacts to touch (mobile);
// desktop mouse/scroll behavior is untouched. Calls `onRefresh` (may be async)
// when the user pulls down past the threshold while scrolled to the top.
export default function PullToRefresh({ onRefresh, children, className = "" }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((e) => {
    // Only begin a pull gesture when the page is already scrolled to the very top.
    if (window.scrollY > 0 || refreshing) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
  }, [refreshing]);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    // Dampen the pull so it feels natural, and cap it.
    setPull(Math.min(delta * 0.5, MAX_PULL));
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, refreshing, onRefresh]);

  const ready = pull >= THRESHOLD;

  return (
    <div
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator — visible only while pulling/refreshing */}
      <div
        className="md:hidden flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: pull }}
      >
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
          {refreshing ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Refreshing…</>
          ) : ready ? (
            <><RefreshCw className="w-4 h-4" /> Release to refresh</>
          ) : (
            <><ArrowDown className="w-4 h-4" /> Pull to refresh</>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}