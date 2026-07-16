"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType } from "react";
import React from "react";

type SupportedElements = "input" | "textarea" | "select";

type BaseProps<T extends ElementType = SupportedElements> = {
  as?: T | ElementType;
  isLoading?: boolean;
  loadingClassName?: string;
} & ComponentProps<T>;

const formControlVariants = cva(
  "flex min-h-11 w-full rounded-md file:border-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/25",
  {
    variants: {
      variant: {
        default:
          "border border-input bg-card transition-[border-color,box-shadow,background-color] file:bg-transparent file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
        gradient:
          "bg-gradient-to-r from-primary to-secondary text-white border-0",
        outline:
          "border border-border-strong focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
        ghost:
          "border border-transparent bg-transparent focus-visible:border-border-strong focus-visible:outline-none",
        link: "text-primary border-0 bg-transparent underline underline-offset-4",
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
  }
);

type FormControlProps = BaseProps<"input"> &
  VariantProps<typeof formControlVariants> & {
    disabled?: boolean;
  };

// FormControl Root Component
const FormControlRoot: React.FC<FormControlProps> = ({
  className,
  loadingClassName,
  variant,
  size,
  as = "input",
  disabled = false,
  isLoading = false,
  ...props
}) => {
  const Comp = as as ElementType;

  return (
    <Comp
      data-as={as}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
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
}) => (
  <div
    role="alert"
    className={cn("text-destructive mt-1 text-sm", className)}
    {...props}
  />
);

// FormControl Helper Component
const FormControlHelper: React.FC<ComponentProps<"div">> = ({
  className,
  ...props
}) => (
  <p
    className={cn("text-muted-foreground mt-1 text-sm", className)}
    {...props}
  />
);

export {
  FormControlRoot as FormControl,
  FormControlLabel,
  FormControlError,
  FormControlHelper,
};
export { formControlVariants, type FormControlProps };
