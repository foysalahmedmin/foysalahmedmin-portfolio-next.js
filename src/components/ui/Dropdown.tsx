"use client";

import type { OverlayState } from "@/hooks/ui/useOverlayState";
import useOverlayState from "@/hooks/ui/useOverlayState";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { createContext, useContext } from "react";
import type { ButtonProps } from "./Button";
import { Button } from "./Button";

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

const dropdownContentVariants = cva("absolute z-50 shadow-lg", {
  variants: {
    variant: {
      default: "border border-gray-200 bg-white rounded-lg p-1",
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
  VariantProps<typeof dropdownContentVariants>;
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
  children,
  asPortal = false,
  ...props
}) => {
  const overlayState = useOverlayState(isOpenProp, setIsOpenProp);

  return (
    <DropdownContext.Provider value={{ ...overlayState, variant, side }}>
      <div
        className={cn(dropdownVariants({ variant, className }), {
          [cn("open", activeClassName)]: overlayState.isOpen,
        })}
        {...props}
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
  children,
  ...props
}) => {
  const { isOpen, variant: contextVariant, side: contextSide } = useDropdown();

  return (
    <div
      className={cn(
        dropdownContentVariants({
          variant: variant ?? contextVariant,
          side: side ?? contextSide,
          className,
        }),
        {
          [cn("visible scale-100 opacity-100", activeClassName)]: isOpen,
          "invisible scale-95 opacity-0": !isOpen,
        },
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Dropdown Item Component
const DropdownItem: React.FC<ComponentProps<"button">> = ({
  className,
  disabled = false,
  children,
  onClick,
  ...props
}) => {
  const { onClose } = useDropdown();

  return (
    <button
      className={cn(
        "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
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
      "px-3 py-2 text-xs font-medium tracking-wider text-gray-500 uppercase",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

// Dropdown Trigger Component
const DropdownTrigger: React.FC<ButtonProps> = ({ onClick, ...props }) => {
  const { onToggle } = useDropdown();

  return (
    <Button
      onClick={(e) => {
        onToggle();
        onClick?.(e);
      }}
      {...props}
    />
  );
};

// Dropdown Compound Component
const Dropdown = Object.assign(DropdownRoot, {
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: DropdownSeparator,
  Label: DropdownLabel,
  Trigger: DropdownTrigger,
});

export {
  Dropdown,
  dropdownContentVariants,
  dropdownVariants,
  useDropdown,
  type DropdownContentProps,
  type DropdownProps,
};
