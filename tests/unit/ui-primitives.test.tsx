// @vitest-environment jsdom

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Tabs,
  TabsContent,
  TabsItem,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("custom UI primitives", () => {
  afterEach(cleanup);

  it("defaults Button to a non-submitting native button", () => {
    render(<Button>Open panel</Button>);

    expect(screen.getByRole("button", { name: "Open panel" })).toHaveAttribute(
      "type",
      "button"
    );
  });

  it("prevents disabled polymorphic links from activating", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button as="a" href="/private" disabled onClick={onClick}>
        Restricted
      </Button>
    );

    const link = screen.getByRole("link", { name: "Restricted" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    await user.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps a controlled Tabs selection owned by its parent", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Tabs value="architecture" onValueChange={onValueChange}>
        <TabsList aria-label="Evidence views">
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent>
          <TabsItem value="architecture">Architecture evidence</TabsItem>
          <TabsItem value="security">Security evidence</TabsItem>
        </TabsContent>
      </Tabs>
    );

    const architecture = screen.getByRole("tab", { name: "Architecture" });
    const security = screen.getByRole("tab", { name: "Security" });
    expect(architecture).toHaveAttribute("aria-selected", "true");
    await user.click(security);
    expect(onValueChange).toHaveBeenCalledWith("security");
    expect(architecture).toHaveAttribute("aria-selected", "true");
    expect(security).toHaveAttribute("aria-selected", "false");
  });

  it("moves Tabs selection with the expected keyboard contract", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="one">
        <TabsList aria-label="Project detail sections">
          <TabsTrigger value="one">Overview</TabsTrigger>
          <TabsTrigger value="disabled" disabled>
            Private
          </TabsTrigger>
          <TabsTrigger value="three">Decisions</TabsTrigger>
        </TabsList>
        <TabsContent>
          <TabsItem value="one">Overview panel</TabsItem>
          <TabsItem value="disabled">Private panel</TabsItem>
          <TabsItem value="three">Decisions panel</TabsItem>
        </TabsContent>
      </Tabs>
    );

    const overview = screen.getByRole("tab", { name: "Overview" });
    overview.focus();
    await user.keyboard("{ArrowRight}");

    const decisions = screen.getByRole("tab", { name: "Decisions" });
    expect(decisions).toHaveFocus();
    expect(decisions).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Decisions panel");
  });

  it("renders a bounded pagination window with current-page semantics", () => {
    render(<Pagination page={50} limit={10} total={1_000} setPage={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Go to page 50" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getAllByRole("button", { name: /Go to page \d+/ })
    ).toHaveLength(5);
  });
});
