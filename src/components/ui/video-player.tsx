"use client";

import { useExclusiveVideoPlayback } from "@/hooks/utils/use-exclusive-video-playback";
import { cn } from "@/lib/utils";
import { Pause, Play, TriangleAlert, Volume2, VolumeX } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "./spinner";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

type PlayerStatus = "loading" | "ready" | "buffering" | "error";

/**
 * Thumbnail + centered play button, shared by the pre-start cover and the
 * paused cover below — same look, different click target.
 */
function VideoCoverButton({
  label,
  thumbnailSrc,
  thumbnailSizes,
  onClick,
}: {
  label: string;
  thumbnailSrc?: string;
  thumbnailSizes: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-0 z-10 block h-full w-full cursor-pointer"
      aria-label={label}
    >
      {thumbnailSrc && (
        <Image
          src={thumbnailSrc}
          alt=""
          fill
          sizes={thumbnailSizes}
          className="object-cover transition-transform duration-300 group-hover/video:scale-105"
        />
      )}
      <span
        aria-hidden
        className="bg-foreground/0 group-hover/video:bg-foreground/15 absolute inset-0 transition-colors duration-300"
      />
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center",
          "h-10 w-16 rounded-xl md:h-12 md:w-20 md:rounded-2xl",
          "bg-card/10 border border-white/20 text-white shadow-2xl backdrop-blur-md",
          "group-hover/video:bg-card/30 transition-all duration-300 group-hover/video:scale-110 group-hover/video:border-white/35",
          "group-active/video:scale-95"
        )}
      >
        <Play
          className="size-5 md:size-6"
          fill="currentColor"
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

/**
 * The two ways up a film is cut. Which one a call site is showing comes from
 * its own data — whether it resolved a landscape film or a short-form reel —
 * and a reel is not a smaller landscape but the frame turned the other way, so
 * the two carry separate defaults instead of sharing one.
 */
export type VideoFrameOrientation = "landscape" | "reel";

/** What each way up is shaped like unless the call site overrides it. */
export const VIDEO_FRAME_ASPECT_RATIO: Record<VideoFrameOrientation, number> = {
  landscape: 16 / 9,
  reel: 9 / 16,
};

/**
 * Either one ratio for whichever orientation is showing, or a ratio per
 * orientation for a call site that renders both depending on its data.
 */
export type VideoFrameAspectRatio =
  | number
  | Partial<Record<VideoFrameOrientation, number>>;

/**
 * The shape the box should hold: the call site's override for the orientation
 * in play, else that orientation's default, else nothing — which leaves the
 * box exactly as the call site sized it.
 */
function resolveFrameAspectRatio(
  orientation: VideoFrameOrientation | undefined,
  override: VideoFrameAspectRatio | undefined
): number | undefined {
  // A zero, negative or NaN ratio would render as an invalid `aspect-ratio`
  // declaration, which the browser drops — leaving the box with no height at
  // all rather than the wrong height. Discard it and fall through to the
  // orientation's default, so a bad value degrades instead of disappearing.
  const usable = (value: number | undefined) =>
    value !== undefined && Number.isFinite(value) && value > 0
      ? value
      : undefined;

  if (typeof override === "number") return usable(override);
  if (!orientation) return undefined;
  return (
    usable(override?.[orientation]) ?? VIDEO_FRAME_ASPECT_RATIO[orientation]
  );
}

interface VideoPlayerCoreProps {
  src: string;
  title: string;
  thumbnailSrc?: string;
  className?: string;
  /** Applied to the poster's <Image>, matching each grid's own responsive columns. */
  thumbnailSizes?: string;
  /**
   * How the player's box is shaped.
   *
   * `false` (the default) is a **fixed frame**: the box keeps one shape
   * whatever film is in it, and a film that doesn't match is letterboxed
   * against the black background below. Most sections want this, because their
   * media sits in a grid or a row whose alignment depends on the box staying a
   * known, constant height. Give that shape with `orientation` or
   * `aspectRatio`; pass neither and the call site's own box is used, untouched.
   *
   * `true` is an **adaptive frame**: the player owns its height and takes the
   * film's own aspect ratio as soon as that is readable, so nothing is ever
   * letterboxed or cropped. `orientation`/`aspectRatio` still apply — they are
   * the shape held until the film's own is known. Use an adaptive frame where
   * nothing alongside the media is aligned against a fixed height.
   */
  adaptiveFrame?: boolean;
  /**
   * Which way up the film being shown is cut — normally read straight off the
   * call site's own data, e.g. `reel_video ? "reel" : "landscape"`. Passing it
   * hands the frame to the player: it sizes its own box, at
   * `VIDEO_FRAME_ASPECT_RATIO[orientation]`, rather than filling the call
   * site's.
   */
  orientation?: VideoFrameOrientation;
  /**
   * Overrides the default for a frame that isn't shaped like either default —
   * a 4:5 social cut, say. Give one number to shape whichever orientation is
   * showing (`4 / 5`), or one per orientation where the data decides which
   * appears (`{ reel: 4 / 5 }` keeps landscape on its own default). Passing a
   * number likewise hands the frame to the player, with or without
   * `orientation`.
   */
  aspectRatio?: VideoFrameAspectRatio;
}

/**
 * The card-grid counterpart to VideoDialog: a video that plays in place
 * rather than in a lightbox, for featured projects, industry reels, work
 * items, and every other list where several of these can be on screen at
 * once. Shares VideoDialog's two hard-won fixes — custom controls instead of
 * the native `controls` attribute, and `playing` tied to real pause state
 * instead of hardcoded `true` — because both defects reproduce here the same
 * way they did in the modal: on a single instance, native controls broke out
 * of a rounded, clipped card exactly as they did out of the dialog's box, and
 * a hardcoded `playing` fights every manual pause. What's different inline is
 * exclusivity: with several of these mounted side by side, starting one used
 * to leave every previously started card still playing underneath it, so
 * every instance registers with the shared playback coordinator and is told
 * to pause the moment another one starts.
 */
export function VideoPlayerCore({
  src,
  title,
  thumbnailSrc,
  className,
  thumbnailSizes = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
  adaptiveFrame = false,
  orientation,
  aspectRatio,
}: VideoPlayerCoreProps) {
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>("loading");
  const [paused, setPaused] = useState(false);
  // Separate from `paused`: `paused` is play/pause *intent* (drives the
  // `playing` prop and the control-bar icon) and flips to false optimistically
  // the instant start() fires, before the provider has actually begun
  // rendering frames. `isPlaying` only flips true once a real playback event
  // confirms it. YouTube removed the `showinfo` embed param years ago, so its
  // title/avatar overlay and big center play/pause/replay icon show natively
  // on the iframe any time it isn't actively playing — controls={false} only
  // suppresses the in-player scrub bar, not this cover. Every other state
  // (loading, buffering, paused, ended, force-paused by exclusivity or
  // scrolling away) needs our own opaque cover in front of the iframe, or
  // YouTube's chrome shows through underneath.
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  // The film's real shape, once it is knowable, for `adaptiveFrame`. Only a
  // native <video> reports this: the YouTube/Vimeo/etc. providers render
  // through a cross-origin iframe whose shim exposes no intrinsic dimensions
  // at all, so for those this stays null and the frame keeps the 16:9 default
  // — right for ordinary landscape embeds, and no worse than a fixed frame for
  // anything else.
  const [videoRatio, setVideoRatio] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const readIntrinsicRatio = useCallback(() => {
    // Only an adaptive frame acts on this; skipping it elsewhere keeps every
    // fixed-frame player off this re-render path entirely.
    if (!adaptiveFrame) return;
    const video = videoRef.current;
    if (!video) return;
    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return;
    const ratio = videoWidth / videoHeight;
    setVideoRatio((prev) => (prev === ratio ? prev : ratio));
  }, [adaptiveFrame]);

  const requestedRatio = resolveFrameAspectRatio(orientation, aspectRatio);

  // What the box is actually set to. A fixed frame holds the requested shape
  // for good. An adaptive one holds it only until the film's own shape is
  // readable — and falls back to landscape if the call site named no shape and
  // the film never reports one (every cross-origin iframe provider).
  const framedRatio = adaptiveFrame
    ? (videoRatio ?? requestedRatio ?? VIDEO_FRAME_ASPECT_RATIO.landscape)
    : requestedRatio;

  // Real, already-settled pixel dimensions instead of the "100%" the box's
  // own aspect-ratio CSS would otherwise resolve to. Same reason VideoDialog
  // computes exact pixels rather than trusting percentage/aspect-ratio: a
  // native <video> repaints itself on every later layout change regardless
  // of when it was told its size, but the YouTube/Vimeo/etc. providers here
  // render through a cross-origin iframe that reads its box once and doesn't
  // reliably re-adapt — on a portrait (9:16) reel this showed up as the
  // video pillarboxed into a fraction of the card with YouTube's own
  // title/avatar/Shorts chrome still visible, because the iframe locked in a
  // size before this card's aspect-ratio box had actually resolved. Measured
  // via ResizeObserver specifically because its callback only ever fires
  // after layout has genuinely settled — no other API in the platform makes
  // that guarantee — and the player stays unmounted until a measurement
  // exists, so the iframe is never created against an unresolved box.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = (rect: { width: number; height: number }) => {
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width <= 0 || height <= 0) return;
      setSize((prev) =>
        prev && prev.width === width && prev.height === height
          ? prev
          : { width, height }
      );
    };
    measure(container.getBoundingClientRect());
    const observer = new ResizeObserver(([entry]) => {
      measure(entry.contentRect);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { claimPlayback, releasePlayback } = useExclusiveVideoPlayback(() => {
    videoRef.current?.pause();
  });

  useEffect(() => {
    if (!started) releasePlayback();
  }, [started, releasePlayback]);

  // Exclusivity alone isn't enough: it only pauses this player when a
  // *different* one starts. Nothing else stops a video that's still playing
  // when it scrolls out of view on its own — a carousel slide advancing past
  // it, react-fast-marquee endlessly carrying it sideways, or a scroll-stacked
  // section (growth-system, work-with-us) covering it with the next stage. In
  // all three, the element stays mounted and simply moves, so this container
  // leaving the viewport is the only signal available. Pause-only: resuming
  // on scroll-back-into-view would restart audio the user isn't expecting.
  useEffect(() => {
    if (!started) return;
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) videoRef.current?.pause();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [started]);

  // Same fallback as VideoDialog: on at least one real device, none of
  // react-player's onReady/onCanPlay/onPlaying fired even though the
  // underlying <video> was already playing, so the custom controls never
  // appeared. This reads the element's own readyState directly, independent
  // of whatever swallowed those events.
  useEffect(() => {
    if (!started || (status !== "loading" && status !== "buffering")) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (video && (video.readyState >= 3 || !video.paused)) {
        setStatus((s) => (s === "error" ? s : "ready"));
        if (!video.paused) setIsPlaying(true);
      }
      readIntrinsicRatio();
    }, 200);
    return () => window.clearInterval(id);
  }, [started, status, readIntrinsicRatio]);

  const start = useCallback(() => {
    setStatus("loading");
    setPaused(false);
    setIsPlaying(false);
    setStarted(true);
  }, []);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    // Compute the target once and use it for both — the YouTube provider's
    // `muted` setter mutes asynchronously (it waits on an internal ready
    // promise before calling the real mute/unmute API), so reading
    // `video.muted` back immediately after assigning it returns the old,
    // pre-toggle value almost every time. The button looked like it did
    // nothing because the icon was always one click behind.
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  }, []);

  const showControls = status === "ready" || status === "buffering";

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/video relative w-full overflow-hidden bg-black",
        className
      )}
      // Set only once a shape has been asked for or worked out. Matching the
      // box to the film leaves `contain` below no space to fill, so no black
      // bar can appear; left unset, the box keeps taking its height from the
      // call site exactly as it always has.
      style={framedRatio ? { aspectRatio: framedRatio } : undefined}
    >
      {!started ? (
        <VideoCoverButton
          label={`Play ${title}`}
          thumbnailSrc={thumbnailSrc}
          thumbnailSizes={thumbnailSizes}
          onClick={start}
        />
      ) : (
        <>
          {status !== "error" && size && (
            <ReactPlayer
              ref={videoRef}
              src={src}
              playing={!paused}
              controls={false}
              playsInline
              // Real pixel numbers reach the YouTube provider's own iframe
              // via a patched dependency (patches/youtube-video-element.patch)
              // — see that patch for why. CSS width/height alone leaves the
              // iframe's own width/height *attributes* at the library's
              // hardcoded "100%", which YouTube reads as "no real size
              // given" and defaults its internal layout to landscape,
              // rendering a portrait (Shorts) video pillarboxed regardless
              // of the iframe's actual CSS-rendered shape.
              // `width`/`height` only exist on the YouTube config type once the
              // patched youtube-video-element from the source project is
              // installed. Without it they are ignored, so the cast keeps this
              // call type-safe in both setups.
              config={{
                youtube: { width: size.width, height: size.height } as never,
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: size.width,
                height: size.height,
                objectFit: "contain",
              }}
              onReady={() => {
                setStatus((s) => (s === "error" ? s : "ready"));
                readIntrinsicRatio();
              }}
              onCanPlay={() => {
                setStatus((s) => (s === "error" ? s : "ready"));
                readIntrinsicRatio();
              }}
              onWaiting={() =>
                setStatus((s) => (s === "ready" ? "buffering" : s))
              }
              onPlaying={() => {
                setStatus((s) => (s === "error" ? s : "ready"));
                setIsPlaying(true);
                readIntrinsicRatio();
              }}
              onError={() => setStatus("error")}
              onPlay={() => {
                setPaused(false);
                setIsPlaying(true);
                claimPlayback();
              }}
              onPause={() => {
                setPaused(true);
                setIsPlaying(false);
              }}
              onVolumeChange={() => setMuted(videoRef.current?.muted ?? false)}
            />
          )}

          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <TriangleAlert
                className="text-primary-foreground/50 size-6"
                aria-hidden="true"
              />
              <p className="text-primary-foreground/70 text-xs">
                This video couldn&apos;t load.
              </p>
            </div>
          )}

          {status !== "error" && !isPlaying && (
            <>
              {status === "loading" || status === "buffering" ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black">
                  <Spinner className="text-primary-foreground size-6" />
                </div>
              ) : (
                <VideoCoverButton
                  label={`Play ${title}`}
                  thumbnailSrc={thumbnailSrc}
                  thumbnailSizes={thumbnailSizes}
                  onClick={togglePlay}
                />
              )}
            </>
          )}

          {showControls && (
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-linear-to-t from-black/80 via-black/30 to-transparent px-2 pt-8 pb-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={paused ? "Play" : "Pause"}
                className="text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
              >
                {paused ? (
                  <Play
                    className="size-4"
                    fill="currentColor"
                    aria-hidden="true"
                  />
                ) : (
                  <Pause
                    className="size-4"
                    fill="currentColor"
                    aria-hidden="true"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
                className="text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
              >
                {muted ? (
                  <VolumeX className="size-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface VideoPlayerProps {
  link: string;
  thumbnail: string;
  className?: string;
  aspectRatio?: "video" | "shorts";
}

/**
 * Thin, named wrapper around InlineVideoPlayer for call sites that think in
 * terms of "video" vs "shorts" rather than a raw aspect class.
 */
export const VideoPlayer = ({
  link,
  thumbnail,
  className,
  aspectRatio = "video",
}: VideoPlayerProps) => (
  <VideoPlayerCore
    src={link}
    title="video"
    thumbnailSrc={thumbnail}
    className={cn(
      "border-primary/10 rounded-2xl border",
      aspectRatio === "shorts"
        ? "mx-auto aspect-9/16 max-w-70"
        : "aspect-video w-full",
      className
    )}
  />
);

export default VideoPlayer;
