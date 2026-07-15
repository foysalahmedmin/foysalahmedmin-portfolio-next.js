"use client";

import { useClickOutside } from "@/hooks/ui/use-click-outside";
import {
  useOverlayState,
  type OverlayState,
} from "@/hooks/ui/use-overlay-state";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { createContext, useContext, useEffect, useId, useRef } from "react";
import type { ButtonProps } from "./button";
import { Button } from "./button";

const dropdownVariants = cva("relative", {
  variants: {
    variant: {
      default: "",
      none: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const dropdownContentVariants = cva("absolute z-30 shadow-lg", {
  variants: {
    variant: {
      default: "border border-gray-200 bg-card rounded-lg p-1",
      none: "",
    },
    side: {
      top: "bottom-full left-0 mb-1 origin-top",
      bottom: "top-full left-0 mt-1 origin-bottom",
      left: "right-full top-0 mr-1 origin-left",
      right: "left-full top-0 ml-1 origin-right",
    },
  },
  defaultVariants: {
    variant: "default",
    side: "bottom",
  },
});

type DropdownContextType = OverlayState &
  VariantProps<typeof dropdownVariants> &
  VariantProps<typeof dropdownContentVariants> & {
    contentId: string;
  };
type DropdownProps = ComponentProps<"div"> &
  VariantProps<typeof dropdownVariants> &
  VariantProps<typeof dropdownContentVariants> & {
    readonly isOpen?: boolean;
    readonly setIsOpen?: (open: boolean) => void;
    readonly asPortal?: boolean;
    readonly activeClassName?: string;
  };

type DropdownContentProps = ComponentProps<"div"> &
  VariantProps<typeof dropdownContentVariants> & {
    readonly activeClassName?: boolean;
  };

const DropdownContext = createContext<DropdownContextType | null>(null);

const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdown must be used within a <Dropdown />");
  }
  return context;
};

// Dropdown Root Component
const DropdownRoot: React.FC<DropdownProps> = ({
  className,
  activeClassName,
  variant,
  side,
  isOpen: isOpenProp,
  setIsOpen: setIsOpenProp,
  onBlur,
  onKeyDown,
  children,
  ...props
}) => {
  const overlayState = useOverlayState(isOpenProp, setIsOpenProp);
  const contentId = useId();
  const rootRef = useClickOutside<HTMLDivElement>(() => {
    if (overlayState.isOpen) overlayState.onClose();
  });

  return (
    <DropdownContext.Provider
      value={{ ...overlayState, variant, side, contentId }}
    >
      <div
        {...props}
        ref={rootRef}
        className={cn(dropdownVariants({ variant, className }), {
          [cn("open", activeClassName)]: overlayState.isOpen,
        })}
        onBlur={(event) => {
          if (
            overlayState.isOpen &&
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            overlayState.onClose();
          }
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && overlayState.isOpen) {
            event.preventDefault();
            overlayState.onClose();
            const trigger = event.currentTarget.querySelector<HTMLElement>(
              "[data-dropdown-trigger]"
            );
            requestAnimationFrame(() => trigger?.focus());
          }
          onKeyDown?.(event);
        }}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

// Dropdown Content Component
const DropdownContent: React.FC<DropdownContentProps> = ({
  className,
  activeClassName,
  variant,
  side,
  id,
  role,
  children,
  ...props
}) => {
  const {
    isOpen,
    variant: contextVariant,
    side: contextSide,
    contentId,
  } = useDropdown();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const frame = requestAnimationFrame(() => {
      ref.current
        ?.querySelector<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"
        )
        ?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen, ref]);

  return (
    <div
      {...props}
      ref={ref}
      id={id || contentId}
      role={role}
      aria-hidden={!isOpen}
      className={cn(
        dropdownContentVariants({
          variant: variant ?? contextVariant,
          side: side ?? contextSide,
          className,
        }),
        {
          [cn("visible scale-100 opacity-100", activeClassName)]: isOpen,
          "invisible scale-95 opacity-0": !isOpen,
        }
      )}
    >
      {children}
    </div>
  );
};

// Dropdown Item Component
const DropdownItem: React.FC<ComponentProps<"button">> = ({
  className,
  disabled = false,
  type = "button",
  children,
  onClick,
  ...props
}) => {
  const { onClose } = useDropdown();

  return (
    <button
      type={type}
      className={cn(
        "w-full rounded-md px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        onClose();
      }}
      {...props}
    >
      {children}
    </button>
  );
};

// Dropdown Separator Component
const DropdownSeparator: React.FC<ComponentProps<"div">> = ({
  className,
  ...props
}) => <div className={cn("my-1 h-px bg-gray-200", className)} {...props} />;

// Dropdown Label Component
const DropdownLabel: React.FC<ComponentProps<"div">> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      "text-muted-foreground px-4 py-2 text-xs font-medium tracking-wider uppercase",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// Dropdown Trigger Component
const DropdownTrigger: React.FC<ButtonProps> = ({
  onClick,
  "aria-haspopup": ariaHasPopup,
  ...props
}) => {
  const { contentId, isOpen, onToggle } = useDropdown();

  return (
    <Button
      {...props}
      data-dropdown-trigger=""
      aria-controls={contentId}
      aria-expanded={isOpen}
      aria-haspopup={ariaHasPopup}
      onClick={(e) => {
        onToggle();
        onClick?.(e);
      }}
    />
  );
};

export {
  DropdownRoot as Dropdown,
  DropdownContent,
  dropdownContentVariants,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
  dropdownVariants,
  useDropdown,
  type DropdownContentProps,
  type DropdownProps,
};
