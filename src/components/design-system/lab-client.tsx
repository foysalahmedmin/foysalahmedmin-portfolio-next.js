"use client";

import {
  EmptyState,
  ErrorState,
  StaleState,
} from "@/components/ui/async-state";
import {
  Tabs,
  TabsContent,
  TabsItem,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/** Client-only pieces of the System lab (they take callbacks or hold state). */
const noop = () => undefined;

export function LabAsyncStates() {
  return (
    <div className="grid gap-4">
      <EmptyState
        title="No case files are published yet"
        description="Read how this site was built instead."
      />
      <ErrorState
        title="The list could not be loaded"
        description="The request timed out. Your filters are kept."
        onRetry={noop}
      />
      <StaleState
        title="Showing saved results"
        description="Reconnect to refresh."
        onRetry={noop}
      />
    </div>
  );
}

export function LabTabs() {
  return (
    <Tabs defaultValue="problem">
      <TabsList className="justify-start">
        <TabsTrigger value="problem">Problem</TabsTrigger>
        <TabsTrigger value="approach">Approach</TabsTrigger>
        <TabsTrigger value="deliverable">Deliverable</TabsTrigger>
        <TabsTrigger value="outcome" disabled>
          Outcome
        </TabsTrigger>
      </TabsList>
      <TabsContent>
        <TabsItem value="problem">
          <p className="text-fg-secondary">
            What is going wrong, in the client's words.
          </p>
        </TabsItem>
        <TabsItem value="approach">
          <p className="text-fg-secondary">
            What I would do and in what order.
          </p>
        </TabsItem>
        <TabsItem value="deliverable">
          <p className="text-fg-secondary">
            What you receive, and in what form.
          </p>
        </TabsItem>
      </TabsContent>
    </Tabs>
  );
}
