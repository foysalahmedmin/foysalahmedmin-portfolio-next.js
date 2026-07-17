// @vitest-environment jsdom

import AdminSignInForm from "@/components/admin/admin-signin-form";
import {
  completeMfaEnrollment,
  signIn,
  verifyMfa,
} from "@/services/auth.service";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));
vi.mock("@/services/auth.service", () => ({
  signIn: vi.fn(),
  completeMfaEnrollment: vi.fn(),
  verifyMfa: vi.fn(),
  refreshToken: vi.fn(),
  signOut: vi.fn(),
}));

const adminInfo = {
  id: "507f1f77bcf86cd799439011",
  name: "Admin",
  role: "admin" as const,
  is_verified: true,
  capabilities: ["admin:access"],
  access_expires_at: "2026-07-17T12:15:00.000Z",
};

describe("admin sign-in MFA experience", () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.refresh.mockReset();
  });
  afterEach(cleanup);

  it("moves from password-authenticated enrollment to one-time recovery codes", async () => {
    vi.mocked(signIn).mockResolvedValue({
      success: true,
      status: 202,
      message: "Complete multi-factor authentication.",
      data: {
        mfa: {
          required: true,
          stage: "enroll",
          expires_at: "2026-07-17T12:05:00.000Z",
          issuer: "Portfolio Test",
          account_name: "admin@example.test",
          manual_secret: "JBSWY3DPEHPK3PXP",
        },
      },
    });
    vi.mocked(completeMfaEnrollment).mockResolvedValue({
      success: true,
      status: 200,
      data: {
        info: adminInfo,
        mfa: {
          required: false,
          stage: "recovery",
          recovery_codes: ["ABCDEFGH-JKLMNPQR", "STUVWXYZ-234567AB"],
        },
      },
    });
    const user = userEvent.setup();
    render(<AdminSignInForm returnTo="/admin" canRecoverSession={false} />);

    await user.type(
      screen.getByLabelText("Email address"),
      "admin@example.test"
    );
    await user.type(screen.getByLabelText("Password"), "PrivatePassword123!");
    await user.click(screen.getByRole("button", { name: /^sign in/i }));

    expect(await screen.findByText("JBSWY3DPEHPK3PXP")).toBeVisible();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Authenticator code"), "123456");
    await user.click(
      screen.getByRole("button", { name: /verify and sign in/i })
    );

    expect(await screen.findByText("ABCDEFGH-JKLMNPQR")).toBeVisible();
    expect(screen.getByText("STUVWXYZ-234567AB")).toBeVisible();
    expect(router.replace).not.toHaveBeenCalled();
    expect(verifyMfa).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: /i have saved these codes/i })
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin"));
  });
});
