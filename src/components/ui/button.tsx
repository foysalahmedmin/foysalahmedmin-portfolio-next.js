"use client";

import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "./button-variants";
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
      "data-variant"?: string;
      onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
    }>;

    const blocked = disabled || isLoading;
    const suppliedOnClick = props.onClick as
      | ((event: ReactMouseEvent<HTMLElement>) => void)
      | undefined;

    return cloneElement(element, {
      ...props,
      "data-variant": variant ?? "default",
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
      data-variant={variant ?? "default"}
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
