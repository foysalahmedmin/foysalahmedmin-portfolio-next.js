"use client";

import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { formControlVariants } from "./form-control-variants";
import type { ComponentProps, ElementType } from "react";
import React from "react";

type SupportedElements = "input" | "textarea" | "select";

type BaseProps<T extends ElementType = SupportedElements> = {
  as?: T | ElementType;
  isLoading?: boolean;
  loadingClassName?: string;
} & ComponentProps<T>;

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
