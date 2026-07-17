// @vitest-environment jsdom

import MetricsStripSection from "@/components/sections/metrics-strip-section";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("MetricsStripSection", () => {
  afterEach(cleanup);

  it("renders only derived or verified proof signals", () => {
    render(
      <MetricsStripSection
        metrics={[
          {
            key: "disciplines",
            label: "Core disciplines",
            value: "5",
            verification: "derived",
            enabled: true,
          },
          {
            key: "clients",
            label: "Client outcomes",
            value: "12",
            verification: "unverified",
            enabled: true,
          },
          {
            key: "guardrails",
            label: "Guardrail tracks",
            value: "3",
            verification: "verified",
            enabled: true,
          },
        ]}
      />
    );

    expect(screen.getByText("Core disciplines")).toBeInTheDocument();
    expect(screen.getByText("Guardrail tracks")).toBeInTheDocument();
    expect(screen.queryByText("Client outcomes")).not.toBeInTheDocument();
    expect(screen.getByText("✓ verified")).toBeInTheDocument();
  });
});
