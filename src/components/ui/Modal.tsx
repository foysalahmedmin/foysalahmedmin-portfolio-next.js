"use client";

import type { OverlayState } from "@/hooks/ui/useOverlayState";
import useOverlayState from "@/hooks/ui/useOverlayState";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import React, { createContext, Fragment, useContext } from "react";
import PortalWrapper from "../wrappers/PortalWrapper";
import type { ButtonProps } from "./Button";
import { Button } from "./Button";

const modalVariants = cva(
  "fixed inset-0 z-[1000] invisible opacity-0 transition-all duration-200 ease-in-out",
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
  },
);

const modalBackdropVariants = cva(
  "fixed inset-0 z-[100] transition-all duration-200 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-black/25",
        none: "",
      },
      size: {
        default: "w-full h-full",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const modalContentVariants = cva(
  "transition-all duration-200 ease-in-out transform",
  {
    variants: {
      variant: {
        default:
          "border border-gray-200 max-h-full overflow-y-auto bg-white rounded-lg shadow-xl",
        none: "",
      },
      size: {
        default: "w-full md:w-[32rem] lg:w-[40rem] text-base",
        sm: "w-full md:w-[32rem]",
        base: "w-full md:w-[32rem] lg:w-[40rem]",
        lg: "w-full lg:w-[40rem] xl:w-[48rem]",
        xl: "w-full xl:w-[48rem] 2xl:w-[52rem]",
        none: "",
      },
      side: {
        center: "mx-auto my-auto origin-center",
        left: "ml-auto my-auto origin-left",
        right: "mr-auto my-auto origin-right",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      side: "center",
    },
  },
);

type ModalContextType = OverlayState &
  VariantProps<typeof modalVariants> &
  VariantProps<typeof modalContentVariants>;
type ModalProps = ComponentProps<"div"> &
  VariantProps<typeof modalVariants> &
  VariantProps<typeof modalContentVariants> & {
    readonly isOpen?: boolean;
    readonly setIsOpen?: (open: boolean) => void;
    readonly asPortal?: boolean;
    readonly activeClassName?: string;
  };
type ModalBackdropProps = ComponentProps<"div"> &
  VariantProps<typeof modalBackdropVariants> & {
    readonly activeClassName?: string;
  };
type ModalContentProps = ComponentProps<"div"> &
  VariantProps<typeof modalContentVariants> & {
    readonly activeClassName?: string;
  };

const ModalContext = createContext<ModalContextType | null>(null);

const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a <Modal />");
  }
  return context;
};

// Modal Root Component
const ModalRoot: React.FC<ModalProps> = ({
  className,
  activeClassName,
  variant,
  size,
  side,
  isOpen: isOpenProp,
  setIsOpen: setIsOpenProp,
  children,
  asPortal = true,
  ...props
}) => {
  const overlayState = useOverlayState(isOpenProp, setIsOpenProp);
  const Comp = asPortal ? PortalWrapper : Fragment;

  return (
    <ModalContext.Provider value={{ ...overlayState, variant, size, side }}>
      <Comp>
        <div
          className={cn(modalVariants({ variant, className }), {
            [cn("visible opacity-100", activeClassName)]: overlayState.isOpen,
          })}
          {...props}
        >
          {children}
        </div>
      </Comp>
    </ModalContext.Provider>
  );
};

// Modal Backdrop Component
const ModalBackdrop: React.FC<ModalBackdropProps> = ({
  className,
  activeClassName,
  variant,
  size,
  children,
  ...props
}) => {
  const { isOpen, onClose } = useModal();

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className={cn(modalBackdropVariants({ variant, size, className }), {
        [cn("visible opacity-100", activeClassName)]: isOpen,
      })}
      {...props}
    >
      {children}
    </div>
  );
};

// Modal Content Component
const ModalContent: React.FC<ModalContentProps> = ({
  className,
  activeClassName,
  variant,
  size,
  side,
  children,
  ...props
}) => {
  const { isOpen } = useModal();

  return (
    <div
      className={cn(modalContentVariants({ variant, size, side, className }), {
        [cn("scale-100 opacity-100", activeClassName)]: isOpen,
      })}
      {...props}
    >
      {children}
    </div>
  );
};

// Modal Header Component
const ModalHeader: React.FC<ComponentProps<"div">> = ({
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

// Modal Title Component
const ModalTitle: React.FC<ComponentProps<"h2">> = ({
  className,
  children,
  ...props
}) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props}>
    {children}
  </h2>
);

// Modal Body Component
const ModalBody: React.FC<ComponentProps<"div">> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("p-6", className)} {...props}>
    {children}
  </div>
);

// Modal Footer Component
const ModalFooter: React.FC<ComponentProps<"div">> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      "flex items-center justify-end gap-3 border-t p-6",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

// Modal Trigger Component
const ModalTrigger: React.FC<ButtonProps> = ({
  onClick,
  children = "Open",
  ...props
}) => {
  const { onOpen } = useModal();

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

// Modal Close Trigger Component
const ModalCloseTrigger: React.FC<ButtonProps> = ({
  onClick,
  variant = "outline",
  shape = "icon",
  children = <X className="h-6 w-6" />,
  ...props
}) => {
  const { onClose } = useModal();

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

// Modal Compound Component
const Modal = Object.assign(ModalRoot, {
  Backdrop: ModalBackdrop,
  Content: ModalContent,
  Header: ModalHeader,
  Title: ModalTitle,
  Body: ModalBody,
  Footer: ModalFooter,
  Trigger: ModalTrigger,
  Close: ModalCloseTrigger,
});

export {
  Modal,
  modalBackdropVariants,
  modalContentVariants,
  modalVariants,
  useModal,
  type ModalBackdropProps,
  type ModalContentProps,
  type ModalProps
};

