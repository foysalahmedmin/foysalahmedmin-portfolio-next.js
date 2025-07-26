import { useEffect, useRef } from "react";

type TUsePageScrollOptions = {
  onNext: () => void;
  onPrev: () => void;
  buffer?: number;
  delay?: number;
  sensitivity?: number;
  enabled?: boolean;
};

const usePageScroll = ({
  onNext,
  onPrev,
  buffer = 0,
  delay = 500,
  sensitivity = 100,
  enabled = true,
}: TUsePageScrollOptions) => {
  const refs = useRef<(Element | null)[]>([]);
  const startY = useRef<(number | null)[]>([]);
  const touchStartY = useRef<(number | null)[]>([]);
  const lastTriggerTime = useRef(0);

  const canTrigger = () => {
    const now = Date.now();
    if (now - lastTriggerTime.current < delay) return false;
    lastTriggerTime.current = now;
    return true;
  };

  const handleWheel = (e: WheelEvent, el: Element) => {
    if (!canTrigger()) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const delta = e.deltaY;

    if (
      delta > sensitivity &&
      scrollTop + clientHeight >= scrollHeight - buffer
    ) {
      onNext();
    } else if (delta < -sensitivity && scrollTop <= buffer) {
      onPrev();
    }
  };

  const handlePointerDown = (e: PointerEvent, index: number) => {
    startY.current[index] = e.clientY;
  };

  const handlePointerUp = (e: PointerEvent, el: Element, index: number) => {
    const start = startY.current[index];
    if (start == null || !canTrigger()) return;

    const delta = start - e.clientY;
    const { scrollTop, scrollHeight, clientHeight } = el;

    if (
      delta > sensitivity &&
      scrollTop + clientHeight >= scrollHeight - buffer
    ) {
      onNext();
    } else if (delta < -sensitivity && scrollTop <= buffer) {
      onPrev();
    }

    startY.current[index] = null;
  };

  const handleTouchStart = (e: TouchEvent, index: number) => {
    touchStartY.current[index] = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent, el: Element, index: number) => {
    const start = touchStartY.current[index];
    if (start == null || !canTrigger()) return;

    const endY = e.changedTouches[0].clientY;
    const delta = start - endY;
    const { scrollTop, scrollHeight, clientHeight } = el;

    if (
      delta > sensitivity &&
      scrollTop + clientHeight >= scrollHeight - buffer
    ) {
      onNext();
    } else if (delta < -sensitivity && scrollTop <= buffer) {
      onPrev();
    }

    touchStartY.current[index] = null;
  };

  useEffect(() => {
    if (!enabled) return;

    const listeners: {
      el: Element;
      wheel: (e: Event) => void;
      up: (e: Event) => void;
      down: (e: Event) => void;
      touchStart: (e: Event) => void;
      touchEnd: (e: Event) => void;
    }[] = [];

    refs.current.forEach((el, index) => {
      if (!el) return;

      const wheel = (e: Event) => handleWheel(e as WheelEvent, el);
      const down = (e: Event) => handlePointerDown(e as PointerEvent, index);
      const up = (e: Event) => handlePointerUp(e as PointerEvent, el, index);

      const touchStart = (e: Event) => handleTouchStart(e as TouchEvent, index);
      const touchEnd = (e: Event) => handleTouchEnd(e as TouchEvent, el, index);

      el.addEventListener("wheel", wheel, { passive: true });
      el.addEventListener("pointerdown", down, { passive: true });
      el.addEventListener("pointerup", up, { passive: true });

      el.addEventListener("touchstart", touchStart, { passive: true });
      el.addEventListener("touchend", touchEnd, { passive: true });

      listeners.push({ el, wheel, down, up, touchStart, touchEnd });
    });

    return () => {
      listeners.forEach(({ el, wheel, down, up, touchStart, touchEnd }) => {
        el.removeEventListener("wheel", wheel);
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("touchstart", touchStart);
        el.removeEventListener("touchend", touchEnd);
      });
    };
  }, [onNext, onPrev, delay, sensitivity, buffer, enabled]);

  const setRef = (index: number) => (el: Element | null) => {
    refs.current[index] = el;
    startY.current[index] ??= null;
    touchStartY.current[index] ??= null;
  };

  return { setRef };
};

export default usePageScroll;
