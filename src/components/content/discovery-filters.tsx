"use client";

import { useDebounce } from "@/hooks/utils/use-debounce";
import { cn } from "@/lib/utils";
import { FilterX, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export type TDiscoveryFilterOption = Readonly<{ value: string; label: string }>;

export type TDiscoveryFilterField =
  | Readonly<{
      type: "search";
      key: string;
      label: string;
      value: string;
      placeholder: string;
    }>
  | Readonly<{
      type: "select";
      key: string;
      label: string;
      value: string;
      defaultValue: string;
      options: readonly TDiscoveryFilterOption[];
    }>;

type TDiscoveryFiltersProps = Readonly<{
  /** Names the controls for assistive technology, e.g. "Filter videos". */
  legend: string;
  fields: readonly TDiscoveryFilterField[];
  /** Page counters that must restart whenever a filter changes. */
  resetKeys: readonly string[];
  /** Where "Clear filters" leads; shown only while a filter is active. */
  clearHref?: string;
  className?: string;
}>;

const controlClass =
  "border-border bg-background focus-visible:ring-ring h-11 min-w-0 rounded-md border px-3 text-sm outline-none focus-visible:ring-2";

/**
 * Filters whose single source of truth is the URL. Changing a control rewrites
 * the query string; the server page re-renders with the new results, so the
 * result list stays server-rendered, shareable and back-button friendly.
 */
export const DiscoveryFilters = ({
  legend,
  fields,
  resetKeys,
  clearHref,
  className,
}: TDiscoveryFiltersProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const searchField = fields.find((field) => field.type === "search");
  const [search, setSearch] = useState(searchField?.value ?? "");
  const debouncedSearch = useDebounce(search.trim(), 350);
  const lastApplied = useRef(searchField?.value ?? "");

  const navigate = (updates: Readonly<Record<string, string | null>>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    resetKeys.forEach((key) => params.delete(key));
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  };

  useEffect(() => {
    if (!searchField || debouncedSearch === lastApplied.current) return;
    lastApplied.current = debouncedSearch;
    navigate({ [searchField.key]: debouncedSearch || null });
    // navigate is intentionally excluded: it only reads the latest params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const isFiltering = fields.some((field) =>
    field.type === "search"
      ? field.value.trim() !== ""
      : field.value !== field.defaultValue
  );

  return (
    <fieldset
      className={cn("grid gap-4", className)}
      aria-busy={isPending || undefined}
    >
      <legend className="sr-only">{legend}</legend>
      {fields.map((field) => {
        const id = `discovery-${field.key}`;
        if (field.type === "search") {
          return (
            <label
              key={field.key}
              htmlFor={id}
              className="grid gap-2 sm:col-span-2"
            >
              <span className="type-label text-muted-foreground">
                {field.label}
              </span>
              <span className="relative block">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id={id}
                  type="search"
                  autoComplete="off"
                  maxLength={100}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={field.placeholder}
                  className={cn(controlClass, "w-full pl-10")}
                />
              </span>
            </label>
          );
        }
        return (
          <label key={field.key} htmlFor={id} className="grid gap-2">
            <span className="type-label text-muted-foreground">
              {field.label}
            </span>
            <select
              id={id}
              value={field.value}
              onChange={(event) =>
                navigate({
                  [field.key]:
                    event.target.value === field.defaultValue
                      ? null
                      : event.target.value,
                })
              }
              className={controlClass}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      <div className="flex min-h-6 items-center gap-4 text-sm sm:col-span-full">
        {isPending ? (
          <p className="text-primary inline-flex items-center gap-2" role="status">
            <RefreshCw
              className="size-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
            Updating results…
          </p>
        ) : null}
        {isFiltering && clearHref ? (
          <Link
            href={clearHref}
            scroll={false}
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 rounded-md font-semibold"
          >
            <FilterX className="size-4" aria-hidden="true" />
            Clear filters
          </Link>
        ) : null}
      </div>
    </fieldset>
  );
};
