"use client";

import { useClickOutside } from "@/hooks/ui/use-click-outside";
import type { OverlayState } from "@/hooks/ui/use-overlay-state";
import { useOverlayState } from "@/hooks/ui/use-overlay-state";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import React, { createContext, Fragment, useContext } from "react";
import PortalWrapper from "../wrappers/portal-wrapper";
import type { ButtonProps } from "./button";
import { Button } from "./button";

const drawerVariants = cva(
  "drawer fixed inset-0 z-[1000] invisible opacity-0 transition-all duration-300 ease-in-out",
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
  "drawer-backdrop fixed inset-0 z-[100] bg-black/25 transition-opacity duration-300",
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
  "drawer-content fixed z-[1000] h-full overflow-y-auto bg-card transition-transform duration-300",
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
  VariantProps<typeof drawerContentVariants>;
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

  const Comp = asPortal ? PortalWrapper : Fragment;

  return (
    <DrawerContext.Provider value={{ ...overlayState, variant, size, side }}>
      <Comp>
        <div
          className={cn(drawerVariants({ variant, className }), {
            [cn("visible opacity-100", activeClassName)]: overlayState.isOpen,
          })}
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
  const { isOpen, onClose } = useDrawer();
  const ref = useClickOutside<HTMLDivElement>(onClose);

  return (
    <div
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
  className,
  children,
  ...props
}) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props}>
    {children}
  </h2>
);

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
  variant = "outline",
  shape = "icon",
  children = <X className="h-6 w-6" />,
  ...props
}) => {
  const { onClose } = useDrawer();

  return (
    <Button
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
