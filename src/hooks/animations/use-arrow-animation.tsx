"use client";

import { useState } from "react";

export const useArrowAnimation = () => {
  const [isHovered, setIsHovered] = useState(false);

  const onMouseEnter = () => setIsHovered(true);
  const onMouseLeave = () => setIsHovered(false);

  const getArrowStyle = (direction: "right" | "left" | "up" | "down" = "right", distance: number = 5) => {
    if (!isHovered) return { transform: "translate(0, 0)", transition: "transform 0.3s ease" };

    const translations = {
      right: `translateX(${distance}px)`,
      left: `translateX(-${distance}px)`,
      up: `translateY(-${distance}px)`,
      down: `translateY(${distance}px)`,
    };

    return {
      transform: translations[direction],
      transition: "transform 0.3s ease",
    };
  };

  return {
    isHovered,
    onMouseEnter,
    onMouseLeave,
    getArrowStyle,
    hoverProps: {
      onMouseEnter,
      onMouseLeave,
    },
  };
};
