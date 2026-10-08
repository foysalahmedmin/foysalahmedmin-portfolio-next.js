import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";

export const Spinner = ({
  className,
  strokeWidth = 2,
  ...props
}: React.ComponentProps<"svg">) => {
  return (
    <LoaderCircle
      strokeWidth={strokeWidth}
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
};
