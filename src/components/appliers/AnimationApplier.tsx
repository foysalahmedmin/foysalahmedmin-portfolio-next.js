"use client";

import useClassIntersectionObserver from "@/hooks/observers/useClassIntersectionObserver";

const AnimationApplier = () => {
  useClassIntersectionObserver({
    selector: ".fade-up",
    classNames: "active",
    options: { threshold: 0 },
    isToggle: false,
    isUnobservable: true,
    dynamic: true,
  });

  useClassIntersectionObserver({
    selector: ".fade-down",
    classNames: "active",
    options: { threshold: 0 },
    isToggle: false,
    isUnobservable: true,
    dynamic: true,
  });

  useClassIntersectionObserver({
    selector: ".fade-left",
    classNames: "active",
    options: { threshold: 0 },
    isToggle: false,
    isUnobservable: true,
    dynamic: true,
  });

  useClassIntersectionObserver({
    selector: ".fade-right",
    classNames: "active",
    options: { threshold: 0 },
    isToggle: false,
    isUnobservable: true,
    dynamic: true,
  });

  return null;
};

export default AnimationApplier;
