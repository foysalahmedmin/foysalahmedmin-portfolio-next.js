"use client";

import useScreenSize from "@/hooks/ui/useScreenSize";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import React from "react";

type IframeVideoScreenProps = ComponentProps<"div"> & {
  src?: string;
  className?: string;
};

const IframeVideScreen: React.FC<IframeVideoScreenProps> = ({
  src = "",
  className,
}) => {
  const { width, height } = useScreenSize();

  // Maintain 16:9 aspect ratio and center it
  const calcWidth = width / 16 > height / 9 ? width : height * (16 / 9);
  const calcHeight = (calcWidth / 16) * 9;

  return (
    <div className={cn("relative h-screen w-full overflow-hidden", className)}>
      <iframe
        src={src}
        width={calcWidth}
        height={calcHeight}
        allow="autoplay; fullscreen"
        allowFullScreen
        data-ready="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-cover"
      />
    </div>
  );
};

export default IframeVideScreen;
