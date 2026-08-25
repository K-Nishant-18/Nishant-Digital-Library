export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
}

/**
 * Kindle-style touch gestures: horizontal swipe turns pages,
 * quick tap = action (e.g. toggle chrome). Long-press selection
 * keeps working because we never preventDefault.
 */
export function bindSwipe(
  el: HTMLElement,
  handlers: { onSwipe: (dir: 'prev' | 'next') => void; onTap: () => void },
  guard?: () => boolean
): () => void {
  let sx = 0;
  let sy = 0;
  let st = 0;

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    sx = t.clientX;
    sy = t.clientY;
    st = Date.now();
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!e.changedTouches.length) return;
    if (guard && !guard()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    const dt = Date.now() - st;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      handlers.onSwipe(dx < 0 ? 'next' : 'prev');
    } else if (Math.abs(dx) < 14 && Math.abs(dy) < 14 && dt < 350) {
      handlers.onTap();
    }
  };

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchend', onTouchEnd);
  };
}
