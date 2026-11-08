"use client";

import { useClickOutside } from "@/hooks/ui/use-click-outside";
import { ChevronDown, LoaderCircle, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";

export type UserMenuProps = Readonly<{
  name: string;
  role: string;
  verified: boolean;
  signingOut: boolean;
  onSignOut: () => void;
}>;

/** A disclosure, not an ARIA menu: name and role, profile settings, sign out. */
export function UserMenu({
  name,
  role,
  verified,
  signingOut,
  onSignOut,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const rootRef = useClickOutside<HTMLDivElement>(close);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A";

  return (
    <div
      ref={rootRef}
      className="cs-user"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        close();
        triggerRef.current?.focus();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="cs-user__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="cs-avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="cs-user__name" aria-hidden="true">
          {name}
        </span>
        <ChevronDown className="cs-icon" aria-hidden="true" />
      </button>
      <div id={panelId} className="cs-user__panel" hidden={!open}>
        <p className="cs-user__who">
          <span className="cs-user__who-name">{name}</span>
          <span className="cs-user__who-role">
            {role.replace("-", " ")}
            {verified ? "" : " · unverified"}
          </span>
        </p>
        <Link href="/admin/settings" className="cs-menu-item" onClick={close}>
          <Settings className="cs-icon" aria-hidden="true" />
          Profile settings
        </Link>
        <button
          type="button"
          className="cs-menu-item"
          disabled={signingOut}
          onClick={onSignOut}
        >
          {signingOut ? (
            <LoaderCircle className="cs-icon" aria-hidden="true" />
          ) : (
            <LogOut className="cs-icon" aria-hidden="true" />
          )}
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
