"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

export type EntityThumbnailProps = {
  src?: string | null;
  alt: string;
  className?: string;
};

export const EntityThumbnail = ({
  src,
  alt,
  className,
}: EntityThumbnailProps) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  const initial = alt.trim().charAt(0).toLocaleUpperCase() || "?";

  return (
    <div
      className={cn(
        "border-border bg-muted relative size-12 shrink-0 overflow-hidden rounded-lg border",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm font-bold"
      >
        {initial}
      </span>
      {src && !failed && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="48px"
          onError={() => setFailed(true)}
          className="object-cover"
        />
      )}
    </div>
  );
};
