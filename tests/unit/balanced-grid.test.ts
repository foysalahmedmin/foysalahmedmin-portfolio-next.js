import { getBalancedGridClass } from "@/lib/layout/balanced-grid";
import { describe, expect, it } from "vitest";

const columnsAt = (classes: string, breakpoint: string): number | null => {
  const match = classes
    .split(" ")
    .find((token) => token.startsWith(`${breakpoint}:grid-cols-`));
  return match ? Number(match.split("-").pop()) : null;
};

describe("balanced grid", () => {
  it("never leaves a lone orphan card in the last row of a three-item set", () => {
    const compact = getBalancedGridClass(3, "compact");
    // Either one column (stacked) or exactly three: never 2 + 1.
    expect(columnsAt(compact, "md")).toBeNull();
    expect(columnsAt(compact, "lg")).toBe(3);

    const roomy = getBalancedGridClass(3, "roomy");
    expect(columnsAt(roomy, "lg")).toBeNull();
    expect(columnsAt(roomy, "xl")).toBe(3);
  });

  it("splits even sets across two columns", () => {
    expect(columnsAt(getBalancedGridClass(2), "md")).toBe(2);
    expect(columnsAt(getBalancedGridClass(4), "md")).toBe(2);
    expect(columnsAt(getBalancedGridClass(4), "xl")).toBe(4);
  });

  it("uses a single column for one item and a safe default for larger sets", () => {
    expect(getBalancedGridClass(1)).toBe("grid-cols-1");
    expect(columnsAt(getBalancedGridClass(6), "xl")).toBe(3);
    expect(columnsAt(getBalancedGridClass(0), "md")).toBe(2);
  });

  it("never exceeds the item count in any breakpoint", () => {
    for (const count of [1, 2, 3, 4, 5, 6, 9]) {
      for (const density of ["compact", "roomy"] as const) {
        const classes = getBalancedGridClass(count, density);
        for (const breakpoint of ["md", "lg", "xl"]) {
          const columns = columnsAt(classes, breakpoint);
          if (columns !== null) expect(columns).toBeLessThanOrEqual(count);
        }
      }
    }
  });
});
