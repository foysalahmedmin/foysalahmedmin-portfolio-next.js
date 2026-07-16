"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps, ComponentType, HTMLAttributes } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

// Core Types
type TabValue = string | number;

type TabsContextValue = {
  readonly activeValue: TabValue | undefined;
  readonly onTabChange: (value: TabValue) => void;
  readonly isAnimating: boolean;
  readonly baseId: string;
};

type TabsRootProps = ComponentProps<"div"> &
  Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    readonly value?: TabValue;
    readonly defaultValue?: TabValue;
    readonly onValueChange?: (value: TabValue) => void;
  };

type TabsListProps = ComponentProps<"ul"> &
  Omit<HTMLAttributes<HTMLUListElement>, "children">;

type TabsTriggerProps = ComponentProps<"button"> & {
  readonly value: TabValue;
  readonly disabled?: boolean;
  readonly isLoading?: boolean;
  readonly activeClassName?: string;
};

type TabsContentProps = ComponentProps<"div"> &
  Omit<HTMLAttributes<HTMLDivElement>, "children">;

type TabsItemProps = ComponentProps<"div"> &
  Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    readonly value: TabValue;
    readonly activeClassName?: string;
  };

// Context Setup
const TabsContext = createContext<TabsContextValue | null>(null);

const useTabs = (): TabsContextValue => {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error("Tabs components must be used within <Tabs>");
  }

  return context;
};

// Root Component
const TabsRoot = ({
  className,
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  ...props
}: TabsRootProps) => {
  const [activeValue, setActiveValue] = useState<TabValue | undefined>(
    controlledValue ?? defaultValue
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const baseId = useId();
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTabChange = useCallback(
    (value: TabValue) => {
      if (value === activeValue) return;

      setIsAnimating(true);
      if (controlledValue === undefined) setActiveValue(value);
      onValueChange?.(value);

      // Reset animation state after transition
      if (animationTimer.current) clearTimeout(animationTimer.current);
      animationTimer.current = setTimeout(() => setIsAnimating(false), 200);
    },
    [activeValue, controlledValue, onValueChange]
  );

  useEffect(() => {
    if (controlledValue !== undefined) {
      setActiveValue(controlledValue);
    }
  }, [controlledValue]);

  useEffect(
    () => () => {
      if (animationTimer.current) clearTimeout(animationTimer.current);
    },
    []
  );

  const contextValue: TabsContextValue = {
    activeValue,
    onTabChange: handleTabChange,
    isAnimating,
    baseId,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("relative w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// List Component
const TabsList = ({ className, children, ...props }: TabsListProps) => {
  return (
    <ul
      role="tablist"
      className={cn(
        "scrollbar-hide flex items-center justify-center gap-1 overflow-x-auto",
        "border-border border-b",
        className
      )}
      {...props}
    >
      {children}
    </ul>
  );
};

// Trigger Component
const TabsTrigger = ({
  className,
  activeClassName,
  value,
  disabled = false,
  isLoading = false,
  children,
  onClick,
  onKeyDown,
  ...props
}: TabsTriggerProps) => {
  const { activeValue, onTabChange, baseId } = useTabs();
  const isActive = value === activeValue;
  const isInteractive = !disabled && !isLoading;

  const handleClick = useCallback(() => {
    if (isInteractive) {
      onTabChange(value);
    }
  }, [isInteractive, onTabChange, value]);

  const stableValue = String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
  const tabId = `${baseId}-tab-${stableValue}`;
  const panelId = `${baseId}-panel-${stableValue}`;

  return (
    <li role="presentation" className="contents">
      <button
        type="button"
        id={tabId}
        role="tab"
        tabIndex={isInteractive && isActive ? 0 : -1}
        aria-selected={isActive}
        aria-controls={panelId}
        disabled={!isInteractive}
        aria-busy={isLoading || undefined}
        data-state={isActive ? "active" : "inactive"}
        data-loading={isLoading}
        onClick={(event) => {
          handleClick();
          onClick?.(event);
        }}
        onKeyDown={(e) => {
          if (
            e.key === "ArrowRight" ||
            e.key === "ArrowLeft" ||
            e.key === "Home" ||
            e.key === "End"
          ) {
            const tabs = Array.from(
              e.currentTarget
                .closest("[role='tablist']")
                ?.querySelectorAll<HTMLElement>(
                  "[role='tab']:not(:disabled)"
                ) ?? []
            );
            const currentIndex = tabs.indexOf(e.currentTarget);
            if (currentIndex >= 0 && tabs.length) {
              e.preventDefault();
              const nextIndex =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? tabs.length - 1
                    : (currentIndex +
                        (e.key === "ArrowRight" ? 1 : -1) +
                        tabs.length) %
                      tabs.length;
              tabs[nextIndex]?.focus();
              tabs[nextIndex]?.click();
            }
          }
          onKeyDown?.(e);
        }}
        className={cn(
          "text-muted-foreground focus-visible:ring-ring hover:text-primary before:bg-primary relative min-h-11 cursor-pointer px-4 py-2 text-sm font-medium transition-[color,background-color,border-color] duration-[var(--motion-fast)] ease-[var(--ease-standard)] before:absolute before:bottom-0 before:left-0 before:h-0.5 before:w-full before:scale-x-0 before:transform before:transition-transform before:duration-[var(--motion-fast)] focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          isActive && "text-primary before:scale-x-100",
          isActive && activeClassName,
          isLoading && "cursor-wait",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "transition-opacity duration-[var(--motion-fast)]",
            isLoading && "opacity-50"
          )}
        >
          {children}
        </span>

        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
          </span>
        )}
      </button>
    </li>
  );
};

// Content Container Component
const TabsContent = ({ className, children, ...props }: TabsContentProps) => {
  const { isAnimating } = useTabs();

  return (
    <div
      className={cn(
        "mt-4 transition-opacity duration-200",
        isAnimating && "opacity-90",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Individual Tab Content Item
const TabsItem = ({
  className,
  activeClassName,
  value,
  children,
  ...props
}: TabsItemProps) => {
  const { activeValue, isAnimating, baseId } = useTabs();
  const isActive = value === activeValue;
  const stableValue = String(value).replace(/[^a-zA-Z0-9_-]/g, "-");

  return (
    <div
      id={`${baseId}-panel-${stableValue}`}
      role="tabpanel"
      aria-labelledby={`${baseId}-tab-${stableValue}`}
      tabIndex={0}
      hidden={!isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "transition-opacity duration-[var(--motion-fast)]",
        isAnimating && "opacity-90",
        activeClassName,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { TabsRoot as Tabs, TabsList, TabsTrigger, TabsContent, TabsItem };
export {
  useTabs,
  type TabsContentProps,
  type TabsContextValue,
  type TabsItemProps,
  type TabsListProps,
  type TabsRootProps,
  type TabsTriggerProps,
  type TabValue,
};
