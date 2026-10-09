import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import {
  FormControl,
  FormControlHelper,
  FormControlLabel,
} from "@/components/ui/form-control";
import { formControlVariants } from "@/components/ui/form-control-variants";
import { Metric } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { StatusMark, type StatusMarkState } from "@/components/ui/status-mark";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { Toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/async-state";
import { cn } from "@/lib/utils";
import { LabAsyncStates, LabTabs } from "./lab-client";
import { LabFrame, TonePair } from "./lab-frame";

const markStates: readonly [StatusMarkState, string][] = [
  ["draft", "Draft"],
  ["published", "Published"],
  ["pending", "Pending review"],
  ["success", "Verified"],
  ["warning", "Needs attention"],
  ["error", "Dead letter"],
  ["archived", "Archived"],
  ["verified", "Verified claim"],
  ["derived", "Derived from code"],
  ["unverified", "Unverified"],
];

const Group = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3">
    <p className="t-eyebrow text-fg-secondary">{title}</p>
    {children}
  </div>
);

function Actions() {
  return (
    <div className="flex flex-col gap-6">
      <Group title="Variants">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="success">Publish</Button>
          <Button variant="link">Link</Button>
        </div>
      </Group>
      <Group title="Sizes">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Group>
      <Group title="States: focus, disabled, loading">
        <div className="flex flex-wrap items-center gap-4">
          <Button data-force-state="focus">Focus</Button>
          <Button disabled>Disabled</Button>
          <Button isLoading>Loading</Button>
        </div>
      </Group>
      <Group title="Text link">
        <p>
          Read the <TextLink href="/case-studies">case files</TextLink> or{" "}
          <TextLink href="https://example.com">an external source</TextLink>.
        </p>
      </Group>
    </div>
  );
}

function Fields() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <FormControlLabel htmlFor="lab-default">Default</FormControlLabel>
        <FormControl id="lab-default" placeholder="Describe the problem" />
        <FormControlHelper>Help text sits under the control.</FormControlHelper>
      </div>
      <div className="flex flex-col gap-2">
        <FormControlLabel htmlFor="lab-focus">Focus (forced)</FormControlLabel>
        <FormControl
          id="lab-focus"
          defaultValue="Focus ring"
          data-force-state="focus"
        />
      </div>
      <div className="flex flex-col gap-2">
        <FormControlLabel htmlFor="lab-invalid">Invalid</FormControlLabel>
        <FormControl
          id="lab-invalid"
          aria-invalid="true"
          aria-describedby="lab-invalid-error"
          defaultValue="not an email"
        />
        <FieldError id="lab-invalid-error">
          Enter an address such as name@company.com.
        </FieldError>
      </div>
      <div className="flex flex-col gap-2">
        <FormControlLabel htmlFor="lab-disabled">Disabled</FormControlLabel>
        <FormControl
          id="lab-disabled"
          disabled
          defaultValue="Read only for now"
        />
      </div>
      <div className="flex flex-col gap-2">
        <FormControlLabel htmlFor="lab-area">Textarea</FormControlLabel>
        <textarea
          id="lab-area"
          rows={3}
          className={cn(
            formControlVariants({ size: "none" }),
            "min-h-24 px-4 py-2 text-sm"
          )}
          placeholder="Context, constraints, timeline"
        />
      </div>
    </div>
  );
}

function Display() {
  return (
    <div className="flex flex-col gap-6">
      <Group title="Status marks (glyph plus label, never colour)">
        <ul className="grid gap-2 sm:grid-cols-2" role="list">
          {markStates.map(([state, label]) => (
            <li key={state}>
              <StatusMark state={state}>{label}</StatusMark>
            </li>
          ))}
        </ul>
      </Group>
      <Group title="Tags">
        <div className="flex flex-wrap gap-2">
          <Tag>Outline</Tag>
          <Tag variant="solid">Solid</Tag>
          <Tag variant="quiet">Quiet</Tag>
        </div>
      </Group>
      <Group title="Metric">
        <Metric
          value="12 wk"
          label="Median delivery"
          source="Case files"
          asOf="Oct 2026"
        />
      </Group>
      <Group title="Panels">
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel>Flat panel</Panel>
          <Panel ticks>Panel with corner ticks</Panel>
          <Panel variant="inverse">Inverse panel (opposite tone)</Panel>
        </div>
      </Group>
      <Group title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Case study</TableCell>
              <TableCell>
                <StatusMark state="published">Published</StatusMark>
              </TableCell>
              <TableCell className="t-mono">r12</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Article</TableCell>
              <TableCell>
                <StatusMark state="draft">Draft</StatusMark>
              </TableCell>
              <TableCell className="t-mono">r3</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Group>
    </div>
  );
}

function Feedback() {
  return (
    <div className="flex flex-col gap-6">
      <Group title="Toasts (glass tier 3)">
        <div className="flex flex-col gap-3">
          <Toast tone="success" title="Published r13." />
          <Toast tone="error" title="The email could not be queued.">
            Retry from the outbox.
          </Toast>
          <Toast tone="info" title="3 unpublished changes." />
        </div>
      </Group>
      <Group title="Skeleton">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Group>
      <Group title="Accordion">
        <Accordion>
          <AccordionItem
            title="How long does a first engagement take?"
            name="lab-faq"
            open
          >
            It depends on the problem. The first reply says which of three paths
            fits.
          </AccordionItem>
          <AccordionItem title="What do I receive?" name="lab-faq">
            A written approach, a working increment, and a handover note.
          </AccordionItem>
        </Accordion>
      </Group>
      <Group title="Tabs">
        <LabTabs />
      </Group>
      <Group title="Empty, error and stale states">
        <LabAsyncStates />
      </Group>
    </div>
  );
}

export function ComponentsSection() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h3 className="mb-4 text-lg font-bold">Actions</h3>
        <TonePair title="Actions">
          <Actions />
        </TonePair>
      </div>
      <div>
        <h3 className="mb-4 text-lg font-bold">Inputs, comfortable (public)</h3>
        <TonePair title="Inputs">
          <Fields />
        </TonePair>
      </div>
      <div>
        <h3 className="mb-4 text-lg font-bold">
          Inputs, compact (console density)
        </h3>
        <TonePair title="Inputs" surface="console" density="compact">
          <Fields />
        </TonePair>
      </div>
      <div>
        <h3 className="mb-4 text-lg font-bold">Display</h3>
        <TonePair title="Display">
          <Display />
        </TonePair>
      </div>
      <div>
        <h3 className="mb-4 text-lg font-bold">Feedback and navigation</h3>
        <TonePair title="Feedback">
          <Feedback />
        </TonePair>
      </div>
      <div>
        <h3 className="mb-4 text-lg font-bold">
          Console surface (compact, no ticks, calm)
        </h3>
        <LabFrame
          title="Console"
          surface="console"
          density="compact"
          tone="ink"
        >
          <Display />
        </LabFrame>
      </div>
    </div>
  );
}
