"use client";

import type { ButtonProps } from "@/components/ui/Button";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType,
} from "embla-carousel";
import emblaCarouselAutoplay from "embla-carousel-autoplay";
import emblaCarouselClassNames from "embla-carousel-class-names";
import useEmblaCarousel from "embla-carousel-react";
import type { KeyboardEvent } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
} from "react";

// ----- Core Types -----

type CarouselOrientation = "horizontal" | "vertical";
type CarouselDirection = "ltr" | "rtl";

type CarouselAutoplayConfig = {
  enabled: boolean;
  delay?: number;
  stopOnInteraction?: boolean;
  stopOnMouseEnter?: boolean;
};

type CarouselNavigationState = {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  scrollPrev: () => void;
  scrollNext: () => void;
};

type CarouselPaginationState = {
  selectedIndex: number;
  scrollSnaps: number[];
  scrollToIndex: (index: number) => void;
};

type CarouselAutoplayState = {
  isHovered: boolean;
  isPaused: boolean;
  resume: () => void;
  pause: () => void;
};

// ----- Component Props Types -----
type CarouselRootProps = ComponentProps<"div"> & {
  readonly orientation?: CarouselOrientation;
  readonly direction?: CarouselDirection;
  readonly autoplay?: boolean | CarouselAutoplayConfig;
  readonly opts?: EmblaOptionsType;
  readonly plugins?: EmblaPluginType[];
  readonly onApiReady?: (api: EmblaCarouselType) => void;
};

type CarouselContentProps = ComponentProps<"div">;
type CarouselItemProps = ComponentProps<"div">;

type CarouselTriggerProps = ButtonProps;

type CarouselPaginationProps = ComponentProps<"div"> & {
  readonly trigger?: ComponentProps<"button"> &
    ((props: CarouselPaginationTriggerProps) => React.ReactElement);
};

type CarouselPaginationTriggerProps = ButtonProps & {
  readonly isActive?: boolean;
  readonly activeClassName?: string;
};

// ----- Context Types -----
type CarouselContextValue = {
  carouselRef: (node: HTMLElement | null) => void;
  api: EmblaCarouselType | undefined;
  opts: EmblaOptionsType | undefined;
  orientation: CarouselOrientation;
  direction: CarouselDirection;
  navigation: CarouselNavigationState;
  pagination: CarouselPaginationState;
  autoplay: CarouselAutoplayState;
  handleKeyDown: (event: KeyboardEvent | KeyboardEvent) => void;
};

// ----- Custom Hooks -----
const useCarouselNavigation = (
  api?: EmblaCarouselType,
): CarouselNavigationState => {
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  const updateScrollState = useCallback(() => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api) return;

    updateScrollState();
    const cleanup = [
      api.on("reInit", updateScrollState),
      api.on("select", updateScrollState),
    ];

    return () => cleanup.forEach((unsub) => unsub.clear());
  }, [api, updateScrollState]);

  return { canScrollPrev, canScrollNext, scrollPrev, scrollNext };
};

const useCarouselPagination = (
  api?: EmblaCarouselType,
): CarouselPaginationState => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollToIndex = useCallback(
    (index: number) => api?.scrollTo(index),
    [api],
  );

  const updatePaginationState = useCallback(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
    setScrollSnaps(api.scrollSnapList());
  }, [api]);

  useEffect(() => {
    if (!api) return;

    updatePaginationState();
    const cleanup = [
      api.on("reInit", updatePaginationState),
      api.on("select", updatePaginationState),
    ];

    return () => cleanup.forEach((unsub) => unsub.clear());
  }, [api, updatePaginationState]);

  return { selectedIndex, scrollSnaps, scrollToIndex };
};

const useCarouselAutoplay = (
  api?: EmblaCarouselType,
): CarouselAutoplayState => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const getAutoplayPlugin = useCallback(() => api?.plugins()?.autoplay, [api]);

  const pause = useCallback(() => {
    const autoplay = getAutoplayPlugin();
    autoplay?.stop();
    setIsPaused(true);
  }, [getAutoplayPlugin]);

  const resume = useCallback(() => {
    const autoplay = getAutoplayPlugin();
    autoplay?.play();
    setIsPaused(false);
  }, [getAutoplayPlugin]);

  useEffect(() => {
    const container = api?.containerNode();
    if (!container) return;

    const handleMouseEnter = () => {
      setIsHovered(true);
      pause();
    };
    const handleMouseLeave = () => {
      setIsHovered(false);
      resume();
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [api, pause, resume]);

  return { isHovered, isPaused, pause, resume };
};

const useCarouselKeyboard = (
  navigation: CarouselNavigationState,
  direction: CarouselDirection = "ltr",
) => {
  return useCallback(
    (event: KeyboardEvent | KeyboardEvent) => {
      const isRtl = direction === "rtl";
      const key = event.key;

      if (key === "ArrowLeft") {
        event.preventDefault();
        if (isRtl) navigation.scrollNext();
        else navigation.scrollPrev();
      } else if (key === "ArrowRight") {
        event.preventDefault();
        if (isRtl) navigation.scrollPrev();
        else navigation.scrollNext();
      }
    },
    [navigation, direction],
  );
};

// ----- Context -----
const CarouselContext = createContext<CarouselContextValue | null>(null);

const useCarousel = (): CarouselContextValue => {
  const context = useContext(CarouselContext);
  if (!context) throw new Error("useCarousel used outside Carousel");
  return context;
};

// ----- Utility Functions -----
const normalizeAutoplayConfig = (
  autoplay?: boolean | CarouselAutoplayConfig,
): CarouselAutoplayConfig => ({
  enabled: false,
  delay: 5000,
  stopOnInteraction: true,
  stopOnMouseEnter: true,
  ...(typeof autoplay === "boolean" ? { enabled: autoplay } : autoplay),
});

const createAutoplayPlugin = (config: CarouselAutoplayConfig) =>
  emblaCarouselAutoplay(config);

// ----- Components -----
const CarouselRoot = ({
  orientation = "horizontal",
  direction = "ltr",
  autoplay = false,
  opts,
  plugins = [],
  onApiReady,
  className,
  children,
  ...props
}: CarouselRootProps) => {
  const autoplayConfig = normalizeAutoplayConfig(autoplay);
  const emblaPlugins = [
    emblaCarouselClassNames(),
    ...(autoplayConfig.enabled ? [createAutoplayPlugin(autoplayConfig)] : []),
    ...plugins,
  ];

  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: orientation === "horizontal" ? "x" : "y", direction },
    emblaPlugins,
  );

  const navigation = useCarouselNavigation(api);
  const pagination = useCarouselPagination(api);
  const autoplayState = useCarouselAutoplay(api);
  const handleKeyDown = useCarouselKeyboard(navigation, direction);

  useEffect(() => {
    if (api && onApiReady) onApiReady(api);
  }, [api, onApiReady]);

  const contextValue: CarouselContextValue = {
    carouselRef,
    api,
    opts,
    orientation,
    direction,
    navigation,
    pagination,
    autoplay: autoplayState,
    handleKeyDown,
  };

  return (
    <CarouselContext.Provider value={contextValue}>
      <div
        className={cn("relative", className)}
        onKeyDownCapture={handleKeyDown}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
};

const CarouselContent = ({ className, ...props }: CarouselContentProps) => {
  const { carouselRef, orientation } = useCarousel();
  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        className={cn(
          "flex h-full",
          orientation === "vertical" && "flex-col",
          className,
        )}
        {...props}
      />
    </div>
  );
};

const CarouselItem = ({ className, ...props }: CarouselItemProps) => (
  <div
    role="group"
    aria-roledescription="slide"
    className={cn("min-w-0 shrink-0 grow-0 basis-full", className)}
    {...props}
  />
);

const CarouselPreviousTrigger = ({
  className,
  shape = "icon",
  variant = "none",
  children = <ArrowIcon direction="left" />,
  ...props
}: CarouselTriggerProps) => {
  const { orientation, navigation } = useCarousel();
  return (
    <Button
      shape={shape}
      variant={variant}
      className={cn(
        "bg-muted text-foreground absolute",
        orientation === "horizontal"
          ? "top-1/2 left-0 -translate-y-1/2"
          : "top-0 left-1/2 -translate-x-1/2 rotate-90",
        className,
      )}
      disabled={!navigation.canScrollPrev}
      onClick={navigation.scrollPrev}
      aria-label="Previous slide"
      {...props}
    >
      {children}
    </Button>
  );
};

const CarouselNextTrigger = ({
  className,
  shape = "icon",
  variant = "none",
  children = <ArrowIcon direction="right" />,
  ...props
}: CarouselTriggerProps) => {
  const { orientation, navigation } = useCarousel();
  return (
    <Button
      shape={shape}
      variant={variant}
      className={cn(
        "bg-muted text-foreground absolute",
        orientation === "horizontal"
          ? "top-1/2 right-0 -translate-y-1/2"
          : "bottom-0 left-1/2 -translate-x-1/2 rotate-90",
        className,
      )}
      disabled={!navigation.canScrollNext}
      onClick={navigation.scrollNext}
      aria-label="Next slide"
      {...props}
    >
      {children}
    </Button>
  );
};

const CarouselPaginationTrigger = ({
  className,
  activeClassName,
  isActive = false,
  variant = "none",
  size = "none",
  ...props
}: CarouselPaginationTriggerProps) => (
  <Button
    className={cn(
      "bg-muted h-0.5 w-full rounded-full px-0",
      isActive && cn("bg-accent", activeClassName),
      className,
    )}
    variant={variant}
    size={size}
    aria-pressed={isActive}
    {...props}
  />
);

const CarouselPagination = ({
  className,
  trigger = CarouselPaginationTrigger,
  ...props
}: CarouselPaginationProps) => {
  const { pagination } = useCarousel();
  return (
    <div
      className={cn(
        "absolute right-0 bottom-4 left-0 mx-auto flex justify-center gap-1",
        className,
      )}
      role="tablist"
      aria-label="Carousel pagination"
      {...props}
    >
      {pagination.scrollSnaps.map((_, index) => {
        const isActive = index === pagination.selectedIndex;
        const Trigger = trigger;

        return (
          <Trigger
            key={index}
            isActive={isActive}
            onClick={() => pagination.scrollToIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        );
      })}
    </div>
  );
};

// ----- Arrow Icon Component -----
const ArrowIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
  >
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d={
        direction === "left" ? "M6 8l-4 4 4 4M2 12h20" : "M18 8l4 4-4 4M2 12h20"
      }
    />
  </svg>
);

// ----- Compound Export -----
const Carousel = Object.assign(CarouselRoot, {
  Content: CarouselContent,
  Item: CarouselItem,
  PreviousTrigger: CarouselPreviousTrigger,
  NextTrigger: CarouselNextTrigger,
  Pagination: CarouselPagination,
  PaginationTrigger: CarouselPaginationTrigger,
});

export { Carousel, useCarousel };
export type {
  CarouselAutoplayConfig,
  CarouselContentProps,
  CarouselContextValue,
  CarouselDirection,
  CarouselItemProps,
  CarouselOrientation,
  CarouselPaginationProps,
  CarouselPaginationTriggerProps,
  CarouselRootProps,
  CarouselTriggerProps,
};
