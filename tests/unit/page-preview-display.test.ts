import { normalizePagePreviewDisplay } from "@/lib/pages/page-preview-display";
import { describe, expect, it } from "vitest";

describe("Page preview display contract", () => {
  it("accepts only bounded theme and motion modes", () => {
    expect(
      normalizePagePreviewDisplay({ theme: "dark", motion: "normal" })
    ).toEqual({ theme: "dark", motion: "normal" });
    expect(
      normalizePagePreviewDisplay({
        theme: ["dark"],
        motion: "unexpected",
      })
    ).toEqual({ theme: "light", motion: "reduced" });
  });
});
