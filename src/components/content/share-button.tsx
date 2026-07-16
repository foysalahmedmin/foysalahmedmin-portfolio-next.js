"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useState } from "react";

type ShareButtonProps = {
  title: string;
};

export default function ShareButton({ title }: ShareButtonProps) {
  const [status, setStatus] = useState("");

  const share = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setStatus("Share dialog opened.");
        return;
      }

      await navigator.clipboard.writeText(url);
      setStatus("Link copied to clipboard.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Sharing is unavailable. Copy the address from your browser.");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        shape="icon"
        className="h-10 w-10 rounded-full"
        onClick={share}
        aria-label={`Share ${title}`}
      >
        <Share2 className="size-4" aria-hidden="true" />
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </>
  );
}
