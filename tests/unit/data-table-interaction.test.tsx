// @vitest-environment jsdom

import DataTable, { type TColumn } from "@/components/ui/data-table";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string;
  name: string;
  status: "draft" | "published";
};

const rows: Row[] = [
  { id: "one", name: "Architecture notes", status: "published" },
  { id: "two", name: "Private draft", status: "draft" },
  { id: "three", name: "Security review", status: "published" },
];

const columns: readonly TColumn<Row>[] = [
  {
    field: "name",
    name: "Name",
    isSearchable: true,
    isSortable: true,
    canHide: false,
  },
  { field: "status", name: "Status", isSortable: true },
];

describe("DataTable interactions", () => {
  afterEach(cleanup);

  it("supports multiple selection, disabled rows, select-page, and clearing", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        config={{ isViewPagination: false }}
        selection={{
          mode: "multiple",
          isRowSelectable: (row) => row.status === "published",
          getRowLabel: (row) => row.name,
          onChange,
        }}
      />
    );

    expect(screen.getByLabelText("Select Private draft")).toBeDisabled();
    await user.click(
      screen.getByLabelText("Select all selectable rows on this page")
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedIds: ["one", "three"],
        source: "page",
      })
    );
    expect(screen.getByText("2 rows selected")).toHaveAttribute(
      "aria-live",
      "polite"
    );
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedIds: [], source: "clear" })
    );
  });

  it("filters locally and exposes an honest empty state", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        config={{ searchDebounceMs: 0, isViewPagination: false }}
        emptyTitle="No matching records"
      />
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Search table" }),
      "missing"
    );
    expect(await screen.findByText("No matching records")).toBeVisible();
  });

  it("cycles sortable headers through ascending, descending, and clear", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        config={{ isViewPagination: false }}
      />
    );

    const nameHeader = screen.getByRole("columnheader", { name: /Name/ });
    const sortButton = within(nameHeader).getByRole("button");
    await user.click(sortButton);
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    await user.click(sortButton);
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    await user.click(sortButton);
    expect(nameHeader).not.toHaveAttribute("aria-sort");
  });
});
