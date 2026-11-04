import { cva } from "class-variance-authority";

// Kept apart from form-control.tsx (a client module) so server components, such as the System lab, can
// style a native element as a form control without crossing the client boundary.
export const formControlVariants = cva(
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
