"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

export type TableProps = React.ComponentProps<"table"> & {
  containerClassName?: string;
};

const TableRoot = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, ...props }, ref) => (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", containerClassName)}
    >
      <table
        ref={ref}
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
);
TableRoot.displayName = "Table";

const TableHeader: React.FC<React.ComponentProps<"thead">> = ({
  className,
  ...props
}) => (
  <thead
    data-slot="table-header"
    className={cn("[&_tr]:border-b", className)}
    {...props}
  />
);

const TableBody: React.FC<React.ComponentProps<"tbody">> = ({
  className,
  ...props
}) => (
  <tbody
    data-slot="table-body"
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
);

const TableFooter: React.FC<React.ComponentProps<"tfoot">> = ({
  className,
  ...props
}) => (
  <tfoot
    data-slot="table-footer"
    className={cn(
      "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
);

const TableRow: React.FC<React.ComponentProps<"tr">> = ({
  className,
  ...props
}) => (
  <tr
    data-slot="table-row"
    className={cn(
      "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
      className
    )}
    {...props}
  />
);

const TableHead: React.FC<React.ComponentProps<"th">> = ({
  className,
  ...props
}) => (
  <th
    data-slot="table-head"
    className={cn(
      "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
);

const TableCell: React.FC<React.ComponentProps<"td">> = ({
  className,
  ...props
}) => (
  <td
    data-slot="table-cell"
    className={cn(
      "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
);

const TableCaption: React.FC<React.ComponentProps<"caption">> = ({
  className,
  ...props
}) => (
  <caption
    data-slot="table-caption"
    className={cn("text-muted-foreground mt-4 text-sm", className)}
    {...props}
  />
);

export {
  TableRoot as Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
