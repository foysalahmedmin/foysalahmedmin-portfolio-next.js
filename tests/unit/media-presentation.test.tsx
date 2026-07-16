// @vitest-environment jsdom

import OptimizedMedia from "@/components/ui/optimized-media";
import {
  normalizeMediaBlurDataUrl,
  normalizeMediaFocalPoint,
  resolveMediaAlt,
} from "@/lib/media/presentation";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ImageProps } from "next/image";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    style,
    onError,
    placeholder,
    blurDataURL,
  }: ImageProps) => (
    <img
      src={typeof src === "string" ? src : ""}
      alt={alt}
      className={className}
      style={style}
      onError={onError}
      data-placeholder={placeholder}
      data-blur-data-url={blurDataURL}
    />
  ),
}));

describe("public media presentation", () => {
  afterEach(cleanup);

  it("applies validated focal, color, and blur metadata", () => {
    const blurDataUrl = "data:image/webp;base64,UklGRg==";
    render(
      <OptimizedMedia
        src="https://cdn.example.com/hero.webp"
        alt="System architecture layers"
        fallback="hero"
        focalPoint={{ x: 0.375, y: 0.625 }}
        dominantColor="#102A43"
        blurDataUrl={blurDataUrl}
      />
    );

    const image = screen.getByRole("img", {
      name: "System architecture layers",
    });
    expect(image).toHaveStyle({
      objectPosition: "37.5% 62.5%",
      backgroundColor: "#102a43",
    });
    expect(image).toHaveAttribute("data-placeholder", "blur");
    expect(image).toHaveAttribute("data-blur-data-url", blurDataUrl);
  });

  it("rejects corrupt presentation metadata and removes it on fallback", () => {
    const { rerender } = render(
      <OptimizedMedia
        src="https://cdn.example.com/hero.webp"
        alt="Backend topology"
        fallback="hero"
        focalPoint={{ x: 1.2, y: 0.5 }}
        dominantColor="url(javascript:alert(1))"
        blurDataUrl="data:image/svg+xml;base64,PHN2Zy8+"
      />
    );

    const image = screen.getByRole("img", { name: "Backend topology" });
    expect(image.style.objectPosition).toBe("");
    expect(image.style.backgroundColor).toBe("");
    expect(image).toHaveAttribute("data-placeholder", "empty");
    expect(image).not.toHaveAttribute("data-blur-data-url");

    rerender(
      <OptimizedMedia
        src="https://cdn.example.com/hero.webp"
        alt="Backend topology"
        fallback="hero"
        focalPoint={{ x: 0.25, y: 0.75 }}
        dominantColor="#112233"
        blurDataUrl="data:image/png;base64,iVBORw0KGgo="
      />
    );
    fireEvent.error(screen.getByRole("img", { name: "Backend topology" }));
    const fallback = screen.getByRole("img", { name: "Backend topology" });
    expect(fallback).not.toHaveAttribute(
      "src",
      "https://cdn.example.com/hero.webp"
    );
    expect(fallback.style.objectPosition).toBe("");
    expect(fallback).toHaveAttribute("data-placeholder", "empty");
  });

  it("keeps decorative alt empty and only uses copy for missing media", () => {
    expect(
      resolveMediaAlt({
        is_decorative: true,
        alt_text: "Never announce this duplicate copy",
      })
    ).toBe("");
    expect(
      resolveMediaAlt(undefined, "Abstract portfolio identity visual")
    ).toBe("Abstract portfolio identity visual");
    expect(resolveMediaAlt({ is_decorative: false })).toBe("");
  });

  it("validates the metadata primitives independently", () => {
    expect(normalizeMediaFocalPoint({ x: 0, y: 1 })).toEqual({ x: 0, y: 1 });
    expect(normalizeMediaFocalPoint({ x: Number.NaN, y: 0.5 })).toBeUndefined();
    expect(
      normalizeMediaBlurDataUrl("data:image/jpeg;base64,LzlqLzRBQVE=")
    ).toBe("data:image/jpeg;base64,LzlqLzRBQVE=");
    expect(
      normalizeMediaBlurDataUrl("data:text/html;base64,PHNjcmlwdD4=")
    ).toBeUndefined();
  });
});
