"use client";

import { StatusMark } from "@/components/ui/status-mark";
import {
  EditorialRequestError,
  publishAdminSiteClient,
} from "@/services/site-page-admin.service";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Notice = Readonly<{
  tone: "success" | "warning" | "error";
  text: string;
  detail?: string;
}>;

/**
 * The same call the Site editor makes (`publishAdminSiteClient` with the revision the reviewer looked
 * at), behind one explicit confirmation. If someone saved a newer draft meanwhile the server answers
 * 409 and nothing is published: the reviewer must look at the new diff first.
 */
export function PublishAction({
  expectedRevision,
  publishedRevision,
  changeCount,
}: Readonly<{
  expectedRevision: number;
  publishedRevision: number | null;
  changeCount: number;
}>) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [notice, setNotice] = useState<Notice | null>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const alreadyPublished = publishedRevision === expectedRevision;

  useEffect(() => {
    if (step === "confirm") confirm.current?.focus();
    else if (step === "idle" && returnFocus.current) {
      returnFocus.current = false;
      primary.current?.focus();
    }
  }, [step]);

  const publish = async () => {
    setStep("busy");
    setNotice(null);
    try {
      const result = await publishAdminSiteClient(expectedRevision);
      setNotice({
        tone: result.cache_invalidated ? "success" : "warning",
        text: result.cache_invalidated
          ? "Site published and public cache refreshed."
          : "Site published. Cache invalidation is queued for retry.",
      });
      router.refresh();
    } catch (error) {
      if (error instanceof EditorialRequestError) {
        setNotice({
          tone: error.status === 409 ? "warning" : "error",
          text:
            error.status === 409
              ? `A newer revision (r${error.currentRevision ?? "?"}) exists. Nothing was published. Reload this page and review the new changes.`
              : error.message,
          detail: [
            error.code,
            error.requestId ? `Request ${error.requestId}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
        });
      } else {
        setNotice({
          tone: "error",
          text: "The publish failed safely. Nothing was published.",
        });
      }
    } finally {
      returnFocus.current = true;
      setStep("idle");
    }
  };

  return (
    <div className="cd-publish">
      {step === "idle" ? (
        <button
          ref={primary}
          type="button"
          className="cd-btn"
          data-variant="primary"
          disabled={alreadyPublished}
          onClick={() => setStep("confirm")}
        >
          {alreadyPublished
            ? "Current revision published"
            : `Publish revision r${expectedRevision}`}
        </button>
      ) : (
        <div role="group" aria-label="Confirm publish" className="cd-confirm">
          <p className="cd-note">
            Publish draft r{expectedRevision} to the public site?{" "}
            <span className="t-mono">{changeCount}</span> listed{" "}
            {changeCount === 1 ? "change goes" : "changes go"} live and the
            public cache is refreshed.
          </p>
          <span className="cd-actions">
            <button
              ref={confirm}
              type="button"
              className="cd-btn"
              data-variant="primary"
              disabled={step === "busy"}
              aria-busy={step === "busy"}
              onClick={publish}
            >
              Confirm publish
            </button>
            <button
              type="button"
              className="cd-btn"
              disabled={step === "busy"}
              onClick={() => {
                returnFocus.current = true;
                setStep("idle");
              }}
            >
              Cancel
            </button>
          </span>
        </div>
      )}
      <div role="status" className="cd-notice">
        {notice ? (
          <>
            <StatusMark state={notice.tone}>
              {notice.tone === "error"
                ? "Error"
                : notice.tone === "warning"
                  ? "Check"
                  : "Published"}
            </StatusMark>{" "}
            {notice.text}
            {notice.detail ? (
              <span className="t-mono cd-faint"> {notice.detail}</span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
