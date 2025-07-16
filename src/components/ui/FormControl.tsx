"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType, ReactNode } from "react";
import React from "react";

type SupportedElements = "input" | "textarea" | "select";

type BaseProps<T extends ElementType = SupportedElements> = {
  as?: T | ElementType;
  asChild?: boolean;
  isLoading?: boolean;
  loadingClassName?: string;
  activeClassName?: string;
  children?: ReactNode;
} & ComponentProps<T>;

const formControlVariants = cva(
  "flex w-full rounded-md file:border-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-input bg-card transition-colors file:bg-transparent file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        gradient:
          "bg-gradient-to-r from-primary to-secondary text-white border-0",
        outline:
          "border border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500",
        ghost:
          "bg-transparent border border-transparent focus:border-gray-300 focus:ring-0",
        link: "border-0 bg-transparent underline text-blue-600 hover:text-blue-800 focus:outline-none",
        none: "",
      },
      size: {
        default: "h-10 px-4 text-sm file:text-sm",
        sm: "h-8 px-3 text-xs file:text-xs",
        md: "h-10 px-4 text-sm file:text-sm",
        lg: "h-12 px-6 text-base file:text-base",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "lg",
    },
  },
);

type FormControlProps = BaseProps<"input"> &
  VariantProps<typeof formControlVariants> & {
    disabled?: boolean;
  };

// FormControl Root Component
const FormControlRoot: React.FC<FormControlProps> = ({
  className = "primary",
  loadingClassName,
  variant,
  size,
  as = "input",
  asChild = false,
  disabled = false,
  isLoading = false,
  ...props
}) => {
  const Comp = asChild ? "span" : (as as ElementType);

  return (
    <Comp
      data-as={as}
      disabled={disabled || isLoading}
      className={cn(formControlVariants({ variant, size, className }), {
        [cn("loading", loadingClassName)]: isLoading,
      })}
      {...props}
    />
  );
};

// FormControl Label Component
const FormControlLabel: React.FC<ComponentProps<"label">> = ({
  className,
  ...props
}) => (
  <label
    className={cn("mb-1 block text-sm font-medium", className)}
    {...props}
  />
);

// FormControl Error Component
const FormControlError: React.FC<ComponentProps<"div">> = ({
  className,
  ...props
}) => <div className={cn("mt-1 text-sm text-red-500", className)} {...props} />;

// FormControl Helper Component
const FormControlHelper: React.FC<ComponentProps<"div">> = ({
  className,
  ...props
}) => (
  <div
    className={cn("text-muted-foreground mt-1 text-sm", className)}
    {...props}
  />
);

// FormControl Compound Component
const FormControl = Object.assign(FormControlRoot, {
  Label: FormControlLabel,
  Error: FormControlError,
  Helper: FormControlHelper,
});

export { FormControl, formControlVariants, type FormControlProps };
