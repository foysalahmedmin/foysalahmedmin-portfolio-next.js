// @vitest-environment jsdom

import AdminRecoveryForm from "@/components/admin/admin-recovery-form";
import AdminSignInForm from "@/components/admin/admin-signin-form";
import { AuthFrame } from "@/components/admin/auth-frame";
import { forgetPassword, signIn } from "@/services/auth.service";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readSource, scanDesignRules } from "../helpers/source-scan";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/services/auth.service", () => ({
  signIn: vi.fn(),
  completeMfaEnrollment: vi.fn(),
  verifyMfa: vi.fn(),
  refreshToken: vi.fn(),
  signOut: vi.fn(),
  forgetPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

// The three auth pages, as each page composes them
const pages = {
  signin: () => (
    <AuthFrame>
      <AdminSignInForm returnTo="/admin" canRecoverSession={false} />
    </AuthFrame>
  ),
  forgot: () => (
    <AuthFrame>
      <AdminRecoveryForm mode="request" />
    </AuthFrame>
  ),
  reset: () => (
    <AuthFrame>
      <AdminRecoveryForm mode="reset" token={"a".repeat(43)} />
    </AuthFrame>
  ),
};

describe("C6 auth frame", () => {
  afterEach(cleanup);

  it.each(Object.entries(pages))(
    "%s has one h1 and one main landmark",
    (_name, page) => {
      const { container } = render(page());

      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      const main = screen.getByRole("main");
      expect(main).toHaveAttribute("id", "main-content");
      expect(main).toHaveAttribute("data-archetype", "C6");
      expect(container.querySelectorAll("main")).toHaveLength(1);
      expect(main).toContainElement(screen.getByRole("heading", { level: 1 }));
      expect(screen.getByText("Admin console")).toBeInTheDocument();
    }
  );

  it("renders the maquette as a decorative, lazy still for both themes", () => {
    const { container } = render(pages.signin());

    const still = container.querySelector(".ca-still");
    expect(still).toHaveAttribute("aria-hidden", "true");
    expect(still?.querySelector(".ca-still-dark")).not.toBeNull();
    expect(still?.querySelector(".ca-still-light")).not.toBeNull();
    const images = Array.from(still?.querySelectorAll("img") ?? []);
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("loading", "lazy");
    }
    expect(still?.querySelector("source")?.getAttribute("srcset")).toMatch(
      /^\/images\/hero\/maquette-(dark|light)-portrait\.avif$/
    );
    // The still sits outside the main landmark: nothing decorative is announced
    expect(screen.getByRole("main")).not.toContainElement(still as HTMLElement);
  });

  it("carries no colour class, literal or large radius in its sources", () => {
    for (const file of [
      "src/components/admin/auth-frame.tsx",
      "src/components/admin/admin-signin-form.tsx",
      "src/components/admin/admin-recovery-form.tsx",
    ]) {
      expect(
        scanDesignRules(readSource(`${process.cwd()}/${file}`).text)
      ).toEqual({});
    }
  });

  it("keeps the sign-in fields and the forgot-password link", () => {
    render(pages.signin());

    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "type",
      "email"
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password"
    );
    expect(
      screen.getByRole("link", { name: "Forgot password?" })
    ).toHaveAttribute("href", "/admin/forgot-password");
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveAttribute(
      "type",
      "submit"
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("keeps the forgot-password field and the way back", () => {
    render(pages.forgot());

    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "id",
      "recovery-email"
    );
    expect(
      screen.getByRole("button", { name: "Send recovery instructions" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to sign in" })
    ).toHaveAttribute("href", "/admin/signin");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("keeps the reset-password fields, hint and the way back", () => {
    render(pages.reset());

    const password = screen.getByLabelText("New password");
    expect(password).toHaveAttribute("minlength", "12");
    expect(password).toHaveAttribute(
      "aria-describedby",
      "password-requirements"
    );
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
    expect(document.getElementById("password-requirements")).toHaveTextContent(
      /at least 12 characters/
    );
    expect(
      screen.getByRole("button", { name: "Update password" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to sign in" })
    ).toHaveAttribute("href", "/admin/signin");
  });

  it("announces a sign-in error in a live region that was already mounted", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("Too many attempts."));
    const user = userEvent.setup();
    const { container } = render(pages.signin());

    const region = container.querySelector(".ca-status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();

    await user.type(screen.getByLabelText("Email address"), "a@example.test");
    await user.type(screen.getByLabelText("Password"), "PrivatePassword123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Error: Too many attempts.");
    expect(region).toContainElement(alert);
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("announces the recovery notice and errors in the same live region", async () => {
    const user = userEvent.setup();
    vi.mocked(forgetPassword).mockResolvedValueOnce(undefined as never);
    const { container } = render(pages.forgot());
    const region = container.querySelector("[aria-live]");
    expect(region).toHaveAttribute("aria-live", "polite");

    await user.type(screen.getByLabelText("Email address"), "a@example.test");
    await user.click(
      screen.getByRole("button", { name: "Send recovery instructions" })
    );
    expect(
      await screen.findByText(/password reset instructions will be sent/i)
    ).toBeInTheDocument();
    expect(region).toHaveTextContent(/instructions will be sent/i);

    vi.mocked(forgetPassword).mockRejectedValueOnce(new Error("Try later."));
    await user.type(screen.getByLabelText("Email address"), "a@example.test");
    await user.click(
      screen.getByRole("button", { name: "Send recovery instructions" })
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Try later.");
    expect(region).toContainElement(screen.getByRole("alert"));
  });
});
