"use client";

import { cn } from "@/lib/utils";
import type {
  ComponentProps,
  ComponentType,
  HTMLAttributes,
  LiHTMLAttributes,
} from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Core Types
type TabValue = string | number;

type TabsContextValue = {
  readonly activeValue: TabValue | undefined;
  readonly onTabChange: (value: TabValue) => void;
  readonly isAnimating: boolean;
};

type TabsRootProps = ComponentProps<"div"> &
  Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    readonly value?: TabValue;
    readonly defaultValue?: TabValue;
    readonly onValueChange?: (value: TabValue) => void;
  };

type TabsListProps = ComponentProps<"ul"> &
  Omit<HTMLAttributes<HTMLUListElement>, "children">;

type TabsTriggerProps = ComponentProps<"li"> &
  Omit<LiHTMLAttributes<HTMLLIElement>, "children" | "onClick"> & {
    readonly value: TabValue;
    readonly disabled?: boolean;
    readonly isLoading?: boolean;
    readonly activeClassName?: string;
    readonly onClick?: (e: React.MouseEvent<HTMLLIElement>) => void;
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
    throw new Error("Tabs compound components must be used within <Tabs.Root>");
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
    controlledValue ?? defaultValue,
  );
  const [isAnimating, setIsAnimating] = useState(false);

  const handleTabChange = useCallback(
    (value: TabValue) => {
      if (value === activeValue) return;

      setIsAnimating(true);
      setActiveValue(value);
      onValueChange?.(value);

      // Reset animation state after transition
      setTimeout(() => setIsAnimating(false), 200);
    },
    [activeValue, onValueChange],
  );

  useEffect(() => {
    if (controlledValue !== undefined) {
      setActiveValue(controlledValue);
    }
  }, [controlledValue]);

  const contextValue: TabsContextValue = {
    activeValue,
    onTabChange: handleTabChange,
    isAnimating,
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
        "border-b border-gray-200 dark:border-gray-700",
        className,
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
  ...props
}: TabsTriggerProps) => {
  const { activeValue, onTabChange } = useTabs();
  const isActive = value === activeValue;
  const isInteractive = !disabled && !isLoading;

  const handleClick = useCallback(() => {
    if (isInteractive) {
      onTabChange(value);
    }
  }, [isInteractive, onTabChange, value]);

  return (
    <li
      role="tab"
      tabIndex={isInteractive ? 0 : -1}
      aria-selected={isActive}
      aria-disabled={disabled}
      data-state={isActive ? "active" : "inactive"}
      data-disabled={disabled}
      data-loading={isLoading}
      onClick={handleClick}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && isInteractive) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        // Base styles
        "relative cursor-pointer px-4 py-2 text-sm font-medium",
        "transition-all duration-200 ease-in-out",
        "hover:text-primary focus:ring-primary/20 focus:ring-2 focus:outline-none",
        "before:absolute before:bottom-0 before:left-0 before:h-0.5 before:w-full",
        "before:bg-primary before:scale-x-0 before:transform before:transition-transform before:duration-200",

        // Inactive state
        "text-gray-600 dark:text-gray-400",

        // Active state
        isActive && [
          "text-primary dark:text-primary",
          "before:scale-x-100",
          activeClassName,
        ],

        // Disabled state
        disabled && [
          "cursor-not-allowed opacity-50",
          "hover:text-gray-600 dark:hover:text-gray-400",
        ],

        // Loading state
        isLoading && "cursor-wait",

        className,
      )}
      {...props}
    >
      <span
        className={cn("transition-all duration-200", isLoading && "opacity-50")}
      >
        {children}
      </span>

      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
    </li>
  );
};

// Content Container Component
const TabsContent = ({ className, children, ...props }: TabsContentProps) => {
  const { isAnimating } = useTabs();

  return (
    <div
      role="tabpanel"
      className={cn(
        "mt-4 transition-opacity duration-200",
        isAnimating && "opacity-90",
        className,
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
  const { activeValue, isAnimating } = useTabs();
  const isActive = value === activeValue;

  if (!isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      aria-labelledby={`tab-${value}`}
      data-state="active"
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
        isAnimating && "animate-out fade-out-0 slide-out-to-top-1",
        activeClassName,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Compound Component Structure using Object.assign
type TabsComponent = ComponentType<TabsRootProps> & {
  Root: ComponentType<TabsRootProps>;
  List: ComponentType<TabsListProps>;
  Trigger: ComponentType<TabsTriggerProps>;
  Content: ComponentType<TabsContentProps>;
  Item: ComponentType<TabsItemProps>;
};

const Tabs = TabsRoot as TabsComponent;

// Assign compound components
Object.assign(Tabs, {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
  Item: TabsItem,
});

// Export everything
export {
  Tabs,
  useTabs,
  type TabsContentProps,
  type TabsContextValue,
  type TabsItemProps,
  type TabsListProps,
  type TabsRootProps,
  type TabsTriggerProps,
  type TabValue,
};
