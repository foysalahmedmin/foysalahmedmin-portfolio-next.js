"use client";

import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ComponentProps, ElementType, ReactNode } from "react";

type SupportedElements = "button" | "input" | "textarea" | "select" | "div";

type BaseProps<T extends ElementType = SupportedElements> = {
  as?: T | ElementType;
  asChild?: boolean;
  isLoading?: boolean;
  loadingClassName?: string;
  activeClassName?: string;
  children?: ReactNode;
} & ComponentProps<T>;

const buttonVariants = cva(
  "button animate-pop relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-none border border-transparent text-base leading-tight whitespace-nowrap transition-all duration-300 ease-in-out active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground hover:bg-foreground hover:text-background",
        gradient:
          "bg-gradient-to-r from-primary to-secondary text-white border-transparent",
        outline:
          "border hover:border-accent hover:text-accent hover:bg-transparent bg-accent text-accent-foreground",
        ghost:
          "bg-transparent text-accent hover:bg-accent/10 hover:text-accent-foreground",
        link: "text-blue-500 hover:text-blue-700 underline",
        none: "",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
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
  },
);

type ButtonProps = BaseProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    disabled?: boolean;
    isAnimation?: boolean;
  };

// Button Root Component
const ButtonRoot: React.FC<ButtonProps> = ({
  className = "primary",
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
  const Comp = asChild ? "span" : (as as ElementType);

  return (
    <Comp
      data-as={as}
      disabled={disabled || isLoading}
      className={cn(buttonVariants({ variant, size, shape, className }), {
        [cn("loading", loadingClassName)]: isLoading,
      })}
      {...props}
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

// Button Compound Component
const Button = Object.assign(ButtonRoot, {
  Icon: ButtonIcon,
  Text: ButtonText,
});

export { Button, buttonVariants, type ButtonProps };
