import {
  buildContactNotificationEmail,
  escapeEmailHtml,
  normalizeEmailSubjectFragment,
} from "@/app/api/contacts/contact-email";
import {
  getContactFailureState,
  getContactRetryDelayMs,
  isAuthorizedContactWorkerRequest,
} from "@/app/api/contacts/contact-outbox.service";
import { describe, expect, it } from "vitest";

describe("contact notification email", () => {
  it("escapes all untrusted HTML and strips header injection", () => {
    const email = buildContactNotificationEmail({
      name: '<img src=x onerror="alert(1)">',
      email: "client@example.com",
      subject: "Architecture\r\nBcc: victim@example.com",
      message: "<script>alert('x')</script> & details",
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.replyTo).toBe("client@example.com");
  });

  it("escapes entities and applies bounded exponential retry", () => {
    expect(escapeEmailHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
    expect(normalizeEmailSubjectFragment("one\n two")).toBe("one two");
    expect(getContactRetryDelayMs(1)).toBe(60_000);
    expect(getContactRetryDelayMs(2)).toBe(120_000);
    expect(getContactRetryDelayMs(99)).toBe(21_600_000);
    expect(getContactFailureState(4, 5)).toBe("retrying");
    expect(getContactFailureState(5, 5)).toBe("dead_letter");
  });

  it("uses a timing-safe bearer check for internal workers", () => {
    const request = (authorization: string) =>
      new Request("http://localhost:3000/api/internal/contact-outbox", {
        headers: { authorization },
      });

    expect(
      isAuthorizedContactWorkerRequest(
        request("Bearer test-contact-worker-secret-at-least-32-characters")
      )
    ).toBe(true);
    expect(
      isAuthorizedContactWorkerRequest(request("Bearer incorrect-secret"))
    ).toBe(false);
  });
});
