"use client";

import { useDialogFocus } from "@/hooks/ui/use-dialog-focus";
import {
  PREFERENCE_COMMANDS,
  filterCommands,
  groupCommands,
  type PaletteAction,
  type PaletteCommand,
} from "@/lib/palette/commands";
import { cn } from "@/lib/utils";
import { useMotion, type MotionPreference } from "@/providers/motion-provider";
import { setScenePreference } from "@/state/scene-store";
import { setTheme } from "@/state/setting-store";
import { ArrowRight, CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useEngine } from "./engine-provider";

type CommandPaletteProps = {
  commands: readonly PaletteCommand[];
  /** Increments each time the shell asks for the palette (shortcut or button); each request toggles it. */
  requests: number;
};

/**
 * The public command palette (M20). A dialog with a combobox and a listbox: the input keeps focus,
 * arrow keys move the highlighted option (`aria-activedescendant`), Enter runs it, Escape closes and
 * focus returns to where it was. Page scroll is locked while it is open (the smooth-scroll engine
 * follows the lock), and the highlighted page is prefetched so choosing it is instant.
 */
export default function CommandPalette({
  commands,
  requests,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const engine = useEngine();
  const { setPreference } = useMotion();
  const listId = useId();

  // Each request from the shell toggles the palette. The handled count lives in a ref so a remount
  // (React strict mode in development) cannot toggle the same request twice.
  const handled = useRef(0);
  useEffect(() => {
    if (requests === handled.current) return;
    handled.current = requests;
    setOpen((value) => !value);
  }, [requests]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  useDialogFocus({ active: open, containerRef: dialogRef, onEscape: close });

  const results = useMemo(
    () => filterCommands([...commands, ...PREFERENCE_COMMANDS], query),
    [commands, query]
  );
  const groups = useMemo(() => groupCommands(results), [results]);
  // Options are numbered in display order (group by group), which is the keyboard order
  const ordered = useMemo(
    () => groups.flatMap((entry) => entry.commands),
    [groups]
  );
  const activeIndex = Math.min(active, Math.max(0, ordered.length - 1));
  const activeCommand = ordered[activeIndex];
  const optionId = (index: number) => `${listId}-option-${index}`;

  // Choosing is instant when the page is already warm
  useEffect(() => {
    if (open && activeCommand?.href && !activeCommand.external) {
      router.prefetch(activeCommand.href);
    }
  }, [activeCommand, open, router]);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView({ block: "nearest" });
    // optionId is derived from listId, which is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open]);

  const runAction = useCallback(
    (action: PaletteAction) => {
      const [kind, value] = action.split(":") as [string, string];
      if (kind === "theme") setTheme(value as "dark" | "light" | "system");
      else if (kind === "motion") setPreference(value as MotionPreference);
      else if (kind === "scene") {
        setScenePreference(value as "auto" | "still");
      }
    },
    [setPreference]
  );

  const choose = useCallback(
    (command: PaletteCommand | undefined) => {
      if (!command) return;
      close();
      if (command.action) {
        runAction(command.action);
      } else if (command.href && command.external) {
        window.open(command.href, "_blank", "noopener,noreferrer");
      } else if (command.href) {
        if (command.href.startsWith("#")) {
          // A chapter on this page: the engine scrolls past any pinned scene with the header offset
          if (engine) engine.scrollTo(command.href);
          else window.location.hash = command.href;
        } else {
          router.push(command.href);
        }
      }
    },
    [close, engine, router, runAction]
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (ordered.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + ordered.length) % ordered.length);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : Math.max(0, ordered.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(activeCommand);
    }
  };

  if (!open) return null;

  let optionIndex = -1;
  return (
    <div
      data-palette-scrim=""
      className="bg-overlay fixed inset-0 z-[var(--z-modal)] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        data-palette=""
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
        className="glass-3 border-line-4 flex max-h-[min(70dvh,34rem)] w-full max-w-xl flex-col overflow-hidden border"
      >
        <div className="border-line-2 flex items-center gap-3 border-b px-4">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              ordered.length > 0 ? optionId(activeIndex) : undefined
            }
            aria-label="Search pages and settings"
            placeholder="Search pages and settings"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-initial-focus=""
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="placeholder:text-fg-secondary h-14 min-w-0 flex-1 bg-transparent text-base outline-none"
          />
          <kbd className="t-eyebrow border-line-3 border px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Results"
          data-lenis-prevent=""
          className="overflow-y-auto overscroll-contain py-2"
        >
          {groups.map(({ group, commands: items }) => (
            <div key={group} role="group" aria-label={group}>
              <div
                role="presentation"
                className="t-eyebrow text-fg-secondary px-4 pt-3 pb-1"
              >
                {group}
              </div>
              {items.map((command) => {
                optionIndex += 1;
                const index = optionIndex;
                return (
                  <div
                    key={command.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === activeIndex}
                    data-palette-option=""
                    onMouseMove={() =>
                      index !== activeIndex && setActive(index)
                    }
                    onClick={() => choose(command)}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-between gap-4 px-4 text-sm"
                    )}
                  >
                    <span className="truncate">{command.label}</span>
                    {command.href ? (
                      <span className="text-fg-secondary flex items-center gap-2 text-xs">
                        <span className="font-mono">
                          {command.external ? "external" : command.href}
                        </span>
                        <ArrowRight className="size-3" aria-hidden="true" />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
          {ordered.length === 0 ? (
            <p className="text-fg-secondary px-4 py-8 text-center text-sm">
              Nothing matches &ldquo;{query}&rdquo;.
            </p>
          ) : null}
        </div>

        <div className="border-line-2 text-fg-secondary flex items-center justify-between gap-4 border-t px-4 py-2 text-xs">
          <span aria-hidden="true">
            ↑ ↓ move · <CornerDownLeft className="inline size-3" /> open · esc
            close
          </span>
          <span role="status" aria-live="polite" className="sr-only">
            {ordered.length === 0
              ? "No results"
              : `${ordered.length} ${ordered.length === 1 ? "result" : "results"}`}
          </span>
        </div>
      </div>
    </div>
  );
}
