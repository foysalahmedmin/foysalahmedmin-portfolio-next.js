"use client";

import React, { useRef, useState } from "react";

interface MagneticProps {
  children: React.ReactNode;
  strength?: number;
}

export default function Magnetic({ children, strength = 0.5 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    if (ref.current) {
      const { height, width, left, top } = ref.current.getBoundingClientRect();
      const middleX = clientX - (left + width / 2);
      const middleY = clientY - (top + height / 2);
      setPosition({ x: middleX * strength, y: middleY * strength });
    }
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;

  return (
    <div
      style={{ 
        position: "relative",
        transform: `translate(${x}px, ${y}px)`,
        transition: "transform 0.3s cubic-bezier(0.33, 1, 0.68, 1)"
      }}
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
    >
      {children}
    </div>
  );
}
