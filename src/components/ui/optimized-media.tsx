"use client";

import {
  getFallbackMedia,
  type FallbackMediaKind,
} from "@/lib/content/fallback-media";
import type { PillarKey } from "@/lib/content/pillars";
import {
  normalizeMediaBlurDataUrl,
  normalizeMediaDominantColor,
  normalizeMediaFocalPoint,
  toMediaObjectPosition,
  type TMediaFocalPoint,
} from "@/lib/media/presentation";
import { cn } from "@/lib/utils";
import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";

type OptimizedMediaProps = Omit<
  ImageProps,
  "src" | "alt" | "onError" | "blurDataURL" | "placeholder"
> & {
  src?: string | null;
  alt: string;
  fallback: FallbackMediaKind;
  pillar?: PillarKey;
  focalPoint?: TMediaFocalPoint | null;
  dominantColor?: string | null;
  blurDataUrl?: string | null;
};

export default function OptimizedMedia({
  src,
  alt,
  fallback,
  pillar,
  focalPoint,
  dominantColor,
  blurDataUrl,
  className,
  fill = true,
  sizes = "(max-width: 768px) 100vw, 50vw",
  style,
  ...props
}: OptimizedMediaProps) {
  const fallbackSource = useMemo(
    () => getFallbackMedia(fallback, pillar),
    [fallback, pillar]
  );
  const requestedSource = src?.trim() || undefined;
  const initialSource = requestedSource || fallbackSource;
  const [source, setSource] = useState(initialSource);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const usingRequestedSource = Boolean(
    requestedSource && source === requestedSource
  );
  const safeFocalPoint = usingRequestedSource
    ? normalizeMediaFocalPoint(focalPoint)
    : undefined;
  const safeDominantColor = usingRequestedSource
    ? normalizeMediaDominantColor(dominantColor)
    : undefined;
  const safeBlurDataUrl = usingRequestedSource
    ? normalizeMediaBlurDataUrl(blurDataUrl)
    : undefined;
  const presentationStyle = {
    ...(safeDominantColor ? { backgroundColor: safeDominantColor } : {}),
    ...(safeFocalPoint
      ? { objectPosition: toMediaObjectPosition(safeFocalPoint) }
      : {}),
    ...style,
  };

  useEffect(() => {
    setSource(requestedSource || fallbackSource);
    setFallbackFailed(false);
  }, [fallbackSource, requestedSource]);

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
      style={presentationStyle}
      placeholder={safeBlurDataUrl ? "blur" : "empty"}
      blurDataURL={safeBlurDataUrl}
      onError={() => {
        if (source !== fallbackSource) setSource(fallbackSource);
        else setFallbackFailed(true);
      }}
    />
  );
}
