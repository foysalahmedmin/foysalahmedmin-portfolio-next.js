// @vitest-environment jsdom

import ContactContentSection from "@/components/(common)/contact-page/contact-content-section";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("ContactContentSection", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("submits to the real endpoint and announces the stored receipt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          success: true,
          status: 201,
          message: "Your message was received.",
          data: {
            receipt: "MIN-1234567890ABCDEF",
            duplicate: false,
          },
        },
        { status: 201 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ContactContentSection />);

    await user.type(screen.getByLabelText("Full Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email Address"), "ada@example.com");
    await user.type(screen.getByLabelText("Subject"), "System design review");
    await user.type(
      screen.getByLabelText("Message"),
      "Please review the architecture for this platform."
    );
    const submit = screen.getByRole("button", { name: /send message/i });
    submit.focus();
    expect(submit).toHaveFocus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/contacts",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: expect.objectContaining({
          "idempotency-key": expect.any(String),
          "x-contact-session": expect.any(String),
        }),
      })
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Reference: MIN-1234567890ABCDEF"
    );
  });

  it("exposes client validation errors without making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ContactContentSection />);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check the highlighted fields"
    );
    expect(screen.getByLabelText("Full Name")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("announces an idempotent duplicate as already received", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          success: true,
          status: 200,
          message: "This message was already received.",
          data: {
            receipt: "MIN-DUPLICATE123456",
            duplicate: true,
          },
        })
      )
    );
    const user = userEvent.setup();
    render(<ContactContentSection />);

    await user.type(screen.getByLabelText("Full Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email Address"), "ada@example.com");
    await user.type(screen.getByLabelText("Subject"), "Duplicate retry");
    await user.type(
      screen.getByLabelText("Message"),
      "This retry should keep the same server receipt."
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "This message was already received. Reference: MIN-DUPLICATE123456"
    );
  });

  it("keeps retry available after a timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timed out", "AbortError"))
    );
    const user = userEvent.setup();
    render(<ContactContentSection />);

    await user.type(screen.getByLabelText("Full Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email Address"), "ada@example.com");
    await user.type(screen.getByLabelText("Subject"), "Timeout retry");
    await user.type(
      screen.getByLabelText("Message"),
      "This message should remain available for a safe retry."
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "retrying will not create a duplicate"
    );
    expect(
      screen.getByRole("button", { name: /retry message/i })
    ).toBeEnabled();
    expect(screen.getByLabelText("Message")).toHaveValue(
      "This message should remain available for a safe retry."
    );
  });
});
