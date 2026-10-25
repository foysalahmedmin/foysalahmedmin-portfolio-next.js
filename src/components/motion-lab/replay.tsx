"use client";

import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";

/** Remounts its children so a demo plays again from its start state. */
export function Replay({
  label = "Replay",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRun((value) => value + 1)}
        >
          {label}
        </Button>
      </div>
      <div key={run}>{children}</div>
    </div>
  );
}
