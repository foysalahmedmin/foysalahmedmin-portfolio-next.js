"use client";

import {
  getFallbackMedia,
  type FallbackMediaKind,
} from "@/lib/content/fallback-media";
import type { PillarKey } from "@/lib/content/pillars";
import { cn } from "@/lib/utils";
import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";

type OptimizedMediaProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src?: string | null;
  alt: string;
  fallback: FallbackMediaKind;
  pillar?: PillarKey;
};

export default function OptimizedMedia({
  src,
  alt,
  fallback,
  pillar,
  className,
  fill = true,
  sizes = "(max-width: 768px) 100vw, 50vw",
  ...props
}: OptimizedMediaProps) {
  const fallbackSource = useMemo(
    () => getFallbackMedia(fallback, pillar),
    [fallback, pillar]
  );
  const initialSource = src?.trim() || fallbackSource;
  const [source, setSource] = useState(initialSource);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  useEffect(() => {
    setSource(src?.trim() || fallbackSource);
    setFallbackFailed(false);
  }, [fallbackSource, src]);

  if (fallbackFailed) {
    return (
      <span
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        className={cn(
          "from-surface-subtle to-secondary absolute inset-0 grid place-items-center bg-gradient-to-br",
          className
        )}
      >
        <span className="type-label text-muted-foreground" aria-hidden="true">
          Media unavailable
        </span>
      </span>
    );
  }

  return (
    <Image
      {...props}
      src={source}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      onError={() => {
        if (source !== fallbackSource) setSource(fallbackSource);
        else setFallbackFailed(true);
      }}
    />
  );
}
