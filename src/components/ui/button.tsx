"use client";

import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type {
  ComponentProps,
  ElementType,
  MouseEvent as ReactMouseEvent,
  ReactElement,
  ReactNode,
} from "react";
import React, { Children, cloneElement, isValidElement } from "react";

type SupportedElements =
  | "button"
  | "a"
  | "input"
  | "textarea"
  | "select"
  | "div";

type BaseProps<T extends ElementType = SupportedElements> = {
  as?: T | ElementType;
  asChild?: boolean;
  isLoading?: boolean;
  loadingClassName?: string;
  activeClassName?: string;
  children?: ReactNode;
} & ComponentProps<T>;

const buttonVariants = cva(
  "button relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-none border border-transparent text-base leading-tight whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-[var(--motion-standard)] ease-[var(--ease-standard)] motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-foreground hover:text-background",
        gradient:
          "bg-gradient-to-r from-primary to-secondary text-white border-transparent",
        outline:
          "border-border-strong bg-transparent text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground",
        ghost:
          "bg-transparent text-foreground hover:bg-muted hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-95",
        success: "bg-success text-success-foreground hover:brightness-95",
        link: "text-primary min-h-0 px-0 underline underline-offset-4 hover:decoration-2",
        none: "",
      },
      size: {
        default: "h-11 px-4 text-sm",
        sm: "h-11 px-3 text-xs",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        none: "",
      },
      shape: {
        default: "rounded-md",
        icon: "rounded-md aspect-square px-0",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
);

type ButtonProps = BaseProps<"button"> &
  Partial<
    Pick<ComponentProps<"a">, "download" | "href" | "rel" | "target">
  > &
  VariantProps<typeof buttonVariants> & {
    disabled?: boolean;
    isAnimation?: boolean;
  };

// Button Root Component
const ButtonRoot: React.FC<ButtonProps> = ({
  className,
  loadingClassName,
  variant,
  size,
  shape,
  as = "button",
  asChild = false,
  disabled = false,
  isLoading = false,
  isAnimation = false,
  children,
  ...props
}) => {
  const classes = cn(buttonVariants({ variant, size, shape, className }), {
    [cn("loading", loadingClassName)]: isLoading,
  });

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) {
      throw new Error("Button with asChild requires exactly one element child");
    }

    const element = child as ReactElement<{
      className?: string;
      "aria-disabled"?: boolean;
      "aria-busy"?: boolean;
      onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
    }>;

    const blocked = disabled || isLoading;
    const suppliedOnClick = props.onClick as
      | ((event: ReactMouseEvent<HTMLElement>) => void)
      | undefined;

    return cloneElement(element, {
      ...props,
      className: cn(classes, element.props.className),
      "aria-busy": isLoading || undefined,
      "aria-disabled": blocked || undefined,
      onClick: (event: ReactMouseEvent<HTMLElement>) => {
        if (blocked) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        element.props.onClick?.(event);
        if (!event.defaultPrevented) suppliedOnClick?.(event);
      },
    });
  }

  const Comp = as as ElementType;
  const canUseDisabled =
    as === "button" || as === "input" || as === "textarea" || as === "select";
  const blocked = disabled || isLoading;
  const suppliedOnClick = props.onClick as
    | ((event: ReactMouseEvent<HTMLElement>) => void)
    | undefined;

  return (
    <Comp
      data-as={as}
      data-animation={isAnimation || undefined}
      {...(canUseDisabled ? { disabled: blocked } : {})}
      {...(as === "button" && !props.type ? { type: "button" } : {})}
      aria-busy={isLoading || undefined}
      aria-disabled={!canUseDisabled && blocked ? true : undefined}
      className={classes}
      {...props}
      {...(!canUseDisabled
        ? {
            onClick: (event: ReactMouseEvent<HTMLElement>) => {
              if (blocked) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              suppliedOnClick?.(event);
            },
          }
        : {})}
    >
      {children}
    </Comp>
  );
};

// Button Icon Component
const ButtonIcon: React.FC<ComponentProps<"span">> = ({
  className,
  children,
  ...props
}) => (
  <span className={cn("inline-flex items-center", className)} {...props}>
    {children}
  </span>
);

// Button Text Component
const ButtonText: React.FC<ComponentProps<"span">> = ({
  className,
  children,
  ...props
}) => (
  <span className={cn("truncate", className)} {...props}>
    {children}
  </span>
);

export {
  ButtonRoot as Button,
  ButtonIcon,
  ButtonText,
  buttonVariants,
  type ButtonProps,
};
