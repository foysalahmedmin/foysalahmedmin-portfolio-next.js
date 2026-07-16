"use client";

import ParallaxLayer from "@/components/motion/parallax-layer";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import OptimizedMedia from "@/components/ui/optimized-media";
import type { PillarKey } from "@/lib/content/pillars";
import type { TFilePopulated } from "@/types/file.type";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const focalPosition = (file: TFilePopulated): string | undefined => {
  if (!file.focal_point) return undefined;
  return `${Math.round(file.focal_point.x * 100)}% ${Math.round(
    file.focal_point.y * 100
  )}%`;
};

export const ProjectGallery = ({
  images,
  projectName,
  pillar,
}: {
  images: readonly TFilePopulated[];
  projectName: string;
  pillar?: PillarKey;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = activeIndex !== null;
  const active = activeIndex === null ? null : images[activeIndex];

  const close = useCallback(() => {
    setActiveIndex(null);
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus());
  }, []);
  const setLightboxOpen = useCallback(
    (open: boolean) => {
      if (!open) close();
    },
    [close]
  );
  const move = useCallback(
    (direction: -1 | 1) => {
      setActiveIndex((current) => {
        if (current === null || images.length < 2) return current;
        return (current + direction + images.length) % images.length;
      });
    },
    [images.length]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, move]);

  if (!images.length) return null;

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {images.map((image, index) => {
          const alt = image.is_decorative
            ? ""
            : image.alt_text || `${projectName} project view ${index + 1}`;
          return (
            <figure key={`${image._id}-${index}`}>
              <button
                type="button"
                onClick={(event) => {
                  lastTriggerRef.current = event.currentTarget;
                  setActiveIndex(index);
                }}
                className="border-border focus-visible:ring-primary group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label={`Open image ${index + 1} of ${images.length}${
                  image.caption ? `: ${image.caption}` : ""
                }`}
              >
                <ParallaxLayer className="absolute -inset-[4%]" depth="subtle">
                  <OptimizedMedia
                    src={image.url}
                    alt={alt}
                    fallback="project"
                    pillar={pillar}
                    sizes="(max-width: 768px) 100vw, 45vw"
                    className="object-cover transition-transform duration-[var(--motion-slow)] group-hover:scale-[1.025]"
                    style={{ objectPosition: focalPosition(image) }}
                  />
                </ParallaxLayer>
                <span className="bg-background/85 text-foreground absolute right-3 bottom-3 grid size-11 place-items-center rounded-full opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Expand className="size-4" aria-hidden="true" />
                </span>
              </button>
              {image.caption && (
                <figcaption className="text-muted-foreground mt-2 text-sm leading-6">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>

      <Modal isOpen={isOpen} setIsOpen={setLightboxOpen} size="none">
        <ModalBackdrop className="flex items-center justify-center p-3 sm:p-6">
          <ModalContent
            size="none"
            className="bg-background relative max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl overflow-hidden rounded-2xl border shadow-2xl"
          >
            <ModalHeader className="gap-4 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <ModalTitle className="truncate text-base sm:text-lg">
                  {active?.caption || `${projectName} gallery`}
                </ModalTitle>
                <p
                  className="text-muted-foreground mt-1 text-xs"
                  aria-live="polite"
                >
                  Image {(activeIndex ?? 0) + 1} of {images.length}
                </p>
              </div>
              <ModalCloseTrigger data-initial-focus />
            </ModalHeader>
            <ModalBody className="p-3 sm:p-5">
              <div className="bg-muted relative aspect-[16/10] max-h-[75dvh] overflow-hidden rounded-xl">
                {active && (
                  <OptimizedMedia
                    src={active.url}
                    alt={
                      active.is_decorative
                        ? ""
                        : active.alt_text ||
                          `${projectName} project view ${(activeIndex ?? 0) + 1}`
                    }
                    fallback="project"
                    pillar={pillar}
                    sizes="100vw"
                    className="object-contain"
                    style={{ objectPosition: focalPosition(active) }}
                  />
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => move(-1)}
                    aria-label="Previous gallery image"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => move(1)}
                    aria-label="Next gallery image"
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </ModalBody>
          </ModalContent>
        </ModalBackdrop>
      </Modal>
    </>
  );
};
