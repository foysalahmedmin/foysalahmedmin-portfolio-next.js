"use client";

import { useDialogFocus } from "@/hooks/ui/use-dialog-focus";
import type { OverlayState } from "@/hooks/ui/use-overlay-state";
import { useOverlayState } from "@/hooks/ui/use-overlay-state";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import React, {
  createContext,
  Fragment,
  useContext,
  useId,
  useRef,
} from "react";
import PortalWrapper from "../wrappers/portal-wrapper";
import type { ButtonProps } from "./button";
import { Button } from "./button";

const drawerVariants = cva(
  "drawer invisible fixed inset-0 z-[var(--z-modal)] opacity-0 transition-[opacity,visibility] duration-[var(--motion-standard)] ease-[var(--ease-standard)]",
  {
    variants: {
      variant: {
        default: "",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const drawerBackdropVariants = cva(
  "drawer-backdrop bg-overlay fixed inset-0 z-[var(--z-overlay)] transition-opacity duration-[var(--motion-standard)]",
  {
    variants: {
      variant: {
        default: "",
        none: "bg-transparent",
      },
      size: {
        default: "w-full h-full",
        none: "",
      },
      side: {
        center: "origin-center",
        start: "origin-start",
        end: "origin-end",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      side: "center",
    },
  }
);

const drawerContentVariants = cva(
  "drawer-content bg-card text-card-foreground fixed z-[var(--z-modal)] h-full overflow-y-auto transition-transform duration-[var(--motion-standard)] ease-[var(--ease-emphasized)] motion-reduce:transform-none",
  {
    variants: {
      variant: {
        default: "",
        none: "",
      },
      size: {
        default: "w-[85vw] sm:w-64 md:w-80 lg:w-[26rem]",
        sm: "w-[75vw] sm:w-48 md:w-64",
        base: "w-[85vw] sm:w-64 md:w-80 lg:w-[26rem]",
        lg: "w-[90vw] sm:w-64 md:w-96 lg:w-[32rem]",
        xl: "w-[95vw] sm:w-80 md:w-[32rem] lg:w-[40rem] xl:w-[48rem]",
        none: "",
      },
      side: {
        center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg",
        start: "start-0 top-0 -translate-x-full",
        end: "end-0 top-0 translate-x-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      side: "start",
    },
  }
);

type DrawerContextType = OverlayState &
  VariantProps<typeof drawerVariants> &
  VariantProps<typeof drawerContentVariants> & { titleId: string };
type DrawerProps = ComponentProps<"div"> &
  VariantProps<typeof drawerVariants> &
  VariantProps<typeof drawerContentVariants> & {
    readonly isOpen?: boolean;
    readonly setIsOpen?: (open: boolean) => void;
    readonly asPortal?: boolean;
    readonly activeClassName?: string;
  };
type DrawerBackdropProps = ComponentProps<"div"> &
  VariantProps<typeof drawerBackdropVariants> & {
    readonly activeClassName?: string;
  };
type DrawerContentProps = ComponentProps<"div"> &
  VariantProps<typeof drawerContentVariants> & {
    readonly activeClassName?: string;
  };

const DrawerContext = createContext<DrawerContextType | null>(null);

const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error("useDrawer must be used within a <Drawer />");
  }
  return context;
};

// Drawer Root Component
const DrawerRoot: React.FC<DrawerProps> = ({
  className,
  activeClassName,
  variant,
  size,
  side,
  isOpen: isOpenProp,
  setIsOpen: setIsOpenProp,
  children,
  asPortal = false,
  ...props
}) => {
  const overlayState = useOverlayState(isOpenProp, setIsOpenProp);
  const titleId = useId();

  const Comp = asPortal ? PortalWrapper : Fragment;

  return (
    <DrawerContext.Provider
      value={{ ...overlayState, variant, size, side, titleId }}
    >
      <Comp>
        <div
          className={cn(drawerVariants({ variant, className }), {
            [cn("visible opacity-100", activeClassName)]: overlayState.isOpen,
          })}
          aria-hidden={!overlayState.isOpen}
          inert={!overlayState.isOpen}
          {...props}
        >
          {children}
        </div>
      </Comp>
    </DrawerContext.Provider>
  );
};

// Drawer Backdrop Component
const DrawerBackdrop: React.FC<DrawerBackdropProps> = ({
  className,
  activeClassName,
  variant,
  size,
  side,
  children,
  ...props
}) => {
  const { isOpen, onClose } = useDrawer();

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        drawerBackdropVariants({ variant, size, side, className }),
        { [cn("opacity-100", activeClassName)]: isOpen }
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Drawer Content Component
const DrawerContent: React.FC<DrawerContentProps> = ({
  className,
  activeClassName,
  variant,
  size,
  side,
  children,
  ...props
}) => {
  const { isOpen, onClose, titleId } = useDrawer();
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus({ active: isOpen, containerRef: ref, onEscape: onClose });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(drawerContentVariants({ variant, size, side, className }), {
        [cn("translate-x-0", activeClassName)]: isOpen,
      })}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  );
};

// Drawer Header Component
const DrawerHeader: React.FC<ComponentProps<"div">> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn("flex items-center justify-between border-b p-6", className)}
    {...props}
  >
    {children}
  </div>
);

// Drawer Title Component
const DrawerTitle: React.FC<ComponentProps<"h2">> = ({
  id,
  className,
  children,
  ...props
}) => {
  const { titleId } = useDrawer();
  return (
    <h2
      id={id ?? titleId}
      className={cn("text-lg font-semibold", className)}
      {...props}
    >
      {children}
    </h2>
  );
};

// Drawer Body Component
const DrawerBody: React.FC<ComponentProps<"div">> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("flex-1 p-6", className)} {...props}>
    {children}
  </div>
);

// Drawer Footer Component
const DrawerFooter: React.FC<ComponentProps<"div">> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      "flex items-center justify-end gap-3 border-t p-6",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// Drawer Trigger Component
const DrawerTrigger: React.FC<ButtonProps> = ({
  onClick,
  children = "Open",
  ...props
}) => {
  const { onOpen } = useDrawer();

  return (
    <Button
      onClick={(e) => {
        onOpen();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

// Drawer Close Trigger Component
const DrawerCloseTrigger: React.FC<ButtonProps> = ({
  onClick,
  "aria-label": ariaLabel = "Close drawer",
  variant = "outline",
  shape = "icon",
  children = <X className="h-6 w-6" />,
  ...props
}) => {
  const { onClose } = useDrawer();

  return (
    <Button
      aria-label={ariaLabel}
      onClick={(e) => {
        onClose();
        onClick?.(e);
      }}
      variant={variant}
      shape={shape}
      {...props}
    >
      {children}
    </Button>
  );
};

export {
  DrawerRoot as Drawer,
  DrawerBackdrop,
  drawerBackdropVariants,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  drawerContentVariants,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  drawerVariants,
  useDrawer,
  type DrawerBackdropProps,
  type DrawerContentProps,
  type DrawerProps,
};
