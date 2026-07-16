import {
  CONTACT_INBOX_INDEX_TARGETS,
  isContactInboxIndexReady,
} from "@/lib/db/migrations/202607150011-contact-inbox-operations";
import { describe, expect, it } from "vitest";

describe("contact inbox operations migration", () => {
  it("declares bounded operational and privacy indexes", () => {
    expect(
      CONTACT_INBOX_INDEX_TARGETS.map((target) => target.options.name)
    ).toEqual(
      expect.arrayContaining([
        "contact_inbox_status_delivery_created",
        "contact_retention_hold_expiry",
        "contact_subject_access",
        "contact_privacy_request_expiry",
      ])
    );
  });

  it("requires TTL and uniqueness options to match", () => {
    const target = CONTACT_INBOX_INDEX_TARGETS.find(
      (entry) => entry.options.name === "contact_privacy_request_expiry"
    )!;
    expect(
      isContactInboxIndexReady(
        {
          name: target.options.name,
          key: target.key,
          expireAfterSeconds: 0,
          v: 2,
        },
        target
      )
    ).toBe(true);
    expect(
      isContactInboxIndexReady(
        { name: target.options.name, key: target.key, v: 2 },
        target
      )
    ).toBe(false);
  });
});
