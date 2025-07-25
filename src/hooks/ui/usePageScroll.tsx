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
  delay = 300,
  sensitivity = 100,
  enabled = true,
}: TUsePageScrollOptions) => {
  const refs = useRef<(Element | null)[]>([]);
  const startY = useRef<(number | null)[]>([]);
  const lastTriggerTime = useRef(0);

  const canTrigger = () => {
    const now = Date.now();
    if (now - lastTriggerTime.current < delay) return false;
    lastTriggerTime.current = now;
    return true;
  };

  const handleWheel = (e: WheelEvent, el: Element) => {
    if (!canTrigger()) return;

    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
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
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;

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

  useEffect(() => {
  if (!enabled) return;

  const listeners: {
    el: Element;
    wheel: (e: Event) => void;
    up: (e: Event) => void;
    down: (e: Event) => void;
  }[] = [];

  refs.current.forEach((el, index) => {
    if (!el) return;

    const wheel = (e: Event) => handleWheel(e as WheelEvent, el);
    const up = (e: Event) => handlePointerUp(e as PointerEvent, el, index);
    const down = (e: Event) => handlePointerDown(e as PointerEvent, index);

    el.addEventListener("wheel", wheel, { passive: true });
    el.addEventListener("pointerup", up, { passive: true });
    el.addEventListener("pointerdown", down, { passive: true });

    listeners.push({ el, wheel, up, down });
  });

  return () => {
    listeners.forEach(({ el, wheel, down, up }) => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointerdown", down);
    });
  };
}, [onNext, onPrev, delay, sensitivity, buffer, enabled]);


  const setRef = (index: number) => (el: Element | null) => {
    refs.current[index] = el;
    if (startY.current[index] === undefined) {
      startY.current[index] = null;
    }
  };

  return { setRef };
};

export default usePageScroll;
