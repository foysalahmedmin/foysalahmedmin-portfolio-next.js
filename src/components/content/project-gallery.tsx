"use client";

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
      <ul
        className="lab-gallery"
        data-lead={images.length >= 3 ? "true" : undefined}
      >
        {images.map((image, index) => {
          const alt = image.is_decorative
            ? ""
            : image.alt_text || `${projectName} project view ${index + 1}`;
          return (
            <li key={`${image._id}-${index}`}>
              <figure className="lab-gallery__item">
                <button
                  type="button"
                  onClick={(event) => {
                    lastTriggerRef.current = event.currentTarget;
                    setActiveIndex(index);
                  }}
                  className="lab-gallery__open"
                  aria-label={`Open image ${index + 1} of ${images.length}${
                    image.caption ? `: ${image.caption}` : ""
                  }`}
                >
                  <span className="lab-gallery__frame ticks">
                    <OptimizedMedia
                      src={image.url}
                      alt={alt}
                      fallback="project"
                      pillar={pillar}
                      sizes="(max-width: 768px) 100vw, 45vw"
                      className="object-cover"
                      style={{ objectPosition: focalPosition(image) }}
                    />
                  </span>
                  <span
                    className="lab-gallery__cue t-eyebrow"
                    aria-hidden="true"
                  >
                    <Expand className="size-3.5" />
                    Expand
                  </span>
                </button>
                {image.caption && (
                  <figcaption className="lab-gallery__caption">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            </li>
          );
        })}
      </ul>

      <Modal isOpen={isOpen} setIsOpen={setLightboxOpen} size="none">
        <ModalBackdrop className="flex items-center justify-center p-3 sm:p-6">
          <ModalContent size="none" className="lab-lightbox">
            <ModalHeader className="gap-4 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <ModalTitle className="truncate text-base sm:text-lg">
                  {active?.caption || `${projectName} gallery`}
                </ModalTitle>
                <p
                  className="t-eyebrow text-fg-secondary mt-1"
                  aria-live="polite"
                >
                  Image {(activeIndex ?? 0) + 1} of {images.length}
                </p>
              </div>
              <ModalCloseTrigger data-initial-focus />
            </ModalHeader>
            <ModalBody className="p-3 sm:p-5">
              <div className="lab-lightbox__stage">
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
