import { cva } from "class-variance-authority";

// Kept apart from button.tsx (a client module) so server components such as CtaBand can style a link
// as a button without crossing the client boundary.
export const buttonVariants = cva(
  "button relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-none border border-transparent text-base leading-tight whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-[var(--motion-standard)] ease-[var(--ease-standard)] motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  {
    variants: {
      variant: {
        // --btn-hover-* are set by the Signal surfaces (tokens.css); the fallbacks are the legacy values
        default:
          "bg-primary text-primary-foreground hover:bg-[var(--btn-hover-bg,var(--foreground))] hover:text-[var(--btn-hover-fg,var(--background))]",
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
