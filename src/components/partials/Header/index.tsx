"use client";

import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { Button, buttonVariants } from "@/components/ui/button";
import OptimizedMedia from "@/components/ui/optimized-media";
import { RollLabel } from "@/components/ui/roll-label";
import { useDialogFocus } from "@/hooks/ui/use-dialog-focus";
import { flipTheme } from "@/lib/motion/theme-flip";
import { openPalette } from "@/lib/palette/shortcut";
import {
  getPrimaryPublicCta,
  getPublicShellLinks,
  type TPublicShellLink,
} from "@/lib/site/public-shell";
import { cn } from "@/lib/utils";
import { useSetting } from "@/state/setting-store";
import {
  ArrowUpRight,
  Menu,
  Monitor,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type MouseEvent,
} from "react";
import { useHeaderHide, useNavIndicator } from "./use-header-chrome";

type HeaderProps = {
  site: TPublicSiteDto;
  className?: string;
};

/** The shell's own call to action wording (docs plan 4.0); where it goes comes from the site's configured CTA. */
const SHELL_CTA_LABEL = "Start a project";

const isActivePath = (pathname: string, href: string): boolean =>
  href === "/"
    ? pathname === "/"
    : pathname.startsWith(`${href}/`) || pathname === href;

const PublicLink = ({
  link,
  className,
  onClick,
  children,
  ...rest
}: {
  link: TPublicShellLink;
  className?: string | undefined;
  onClick?: (() => void) | undefined;
  children?: React.ReactNode;
} & Omit<
  ComponentProps<"a">,
  "href" | "target" | "rel" | "className" | "onClick" | "children"
>) => {
  if (link.external) {
    return (
      <a
        href={link.href}
        className={className}
        onClick={onClick}
        target={link.href.startsWith("https:") ? "_blank" : undefined}
        rel={link.href.startsWith("https:") ? "noopener noreferrer" : undefined}
        {...rest}
      >
        {children ?? link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className} onClick={onClick} {...rest}>
      {children ?? link.label}
    </Link>
  );
};

const ThemeToggle = () => {
  const theme = useSetting((setting) => setting.theme);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const icon = !mounted ? (
    <Monitor className="size-5" aria-hidden="true" />
  ) : theme === "dark" ? (
    <Sun className="size-5" aria-hidden="true" />
  ) : theme === "light" ? (
    <Moon className="size-5" aria-hidden="true" />
  ) : (
    <Monitor className="size-5" aria-hidden="true" />
  );

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    flipTheme({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      shape="icon"
      onClick={onClick}
      aria-label="Change color theme"
    >
      {icon}
    </Button>
  );
};

const subscribeNothing = () => () => undefined;
/** `⌘` on Apple platforms, `Ctrl` elsewhere; nothing until the client knows, so server and client agree. */
const useShortcutHint = () =>
  useSyncExternalStore(
    subscribeNothing,
    () => (/Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    () => ""
  );

const Brand = ({ site }: { site: TPublicSiteDto }) => {
  const name =
    site.identity.short_name ||
    site.identity.public_name ||
    "Engineering Portfolio";
  const tagline =
    site.positioning.mobile ||
    site.positioning.compact ||
    "Product engineering";
  const logo = site.brand.logo_dark ?? site.brand.logo_light;

  return (
    <Link
      href="/"
      className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl"
      aria-label={`${name} home`}
    >
      <span className="border-border bg-surface-subtle relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border">
        {logo ? (
          <OptimizedMedia
            src={logo.url}
            alt=""
            fallback="profile"
            sizes="44px"
            className="object-contain p-1"
          />
        ) : (
          <span className="text-primary text-sm font-black" aria-hidden="true">
            {name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </span>
        )}
      </span>
      <span className="hidden min-w-0 leading-tight sm:block">
        <span className="block truncate text-sm font-black tracking-wide uppercase">
          {name}
        </span>
        <span className="text-muted-foreground block max-w-48 truncate text-[0.68rem] font-semibold">
          {tagline}
        </span>
      </span>
    </Link>
  );
};

const MobileNavigation = ({
  open,
  links,
  site,
  cta,
  onClose,
}: {
  open: boolean;
  links: readonly TPublicShellLink[];
  site: TPublicSiteDto;
  cta: TPublicShellLink | null;
  onClose: () => void;
}) => {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ active: open, containerRef: dialogRef, onEscape: onClose });

  return (
    <div
      ref={dialogRef}
      id="public-mobile-navigation"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-mobile-navigation-title"
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      className={cn(
        "bg-background/95 fixed inset-0 z-[calc(var(--z-header)+1)] overflow-y-auto px-6 py-6 backdrop-blur-2xl transition-[opacity,visibility] duration-[var(--dur-base)] motion-reduce:transition-none xl:hidden",
        open ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
      )}
    >
      <div className="mx-auto flex min-h-full max-w-2xl flex-col">
        <div className="flex items-center justify-between gap-5">
          <p
            id="public-mobile-navigation-title"
            className="t-eyebrow tracking-[0.18em]"
          >
            Navigation
          </p>
          <Button
            type="button"
            variant="outline"
            shape="icon"
            data-initial-focus
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <nav className="my-auto py-12" aria-label="Mobile primary navigation">
          <ul className="space-y-2" role="list">
            {links.map((link, index) => {
              const active =
                !link.external && isActivePath(pathname, link.href);
              return (
                <li key={link.key}>
                  <PublicLink
                    link={link}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-16 items-center justify-between rounded-xl px-4 text-2xl font-black tracking-tight sm:text-3xl",
                      active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {link.label}
                    </span>
                    {link.external && (
                      <ArrowUpRight className="size-5" aria-hidden="true" />
                    )}
                  </PublicLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-border flex flex-col gap-4 border-t pt-6">
          {cta && (
            <PublicLink
              link={cta}
              onClick={onClose}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              {SHELL_CTA_LABEL}
            </PublicLink>
          )}
          {site.contact.public_email && (
            <a
              href={`mailto:${site.contact.public_email}`}
              className="text-muted-foreground inline-flex min-h-11 items-center text-sm font-semibold"
            >
              {site.contact.public_email}
            </a>
          )}
          <p className="text-muted-foreground text-sm leading-6">
            {site.positioning.canonical ||
              "Frontend · Backend · AI Automation · System Design · Full-Stack"}
          </p>
        </div>
      </div>
    </div>
  );
};

const Header = ({ site, className }: HeaderProps) => {
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const nav = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = getPublicShellLinks(site, "header");
  const cta = getPrimaryPublicCta(site) ?? {
    key: "start",
    label: SHELL_CTA_LABEL,
    href: "/contact",
    external: false,
  };
  const hint = useShortcutHint();
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useHeaderHide(header, mobileOpen);
  useNavIndicator(nav, pathname);
  useEffect(() => closeMobile(), [closeMobile, pathname]);

  return (
    <>
      <header
        ref={header}
        data-chrome
        className={cn(
          "glass-1 border-line-2 text-foreground sticky top-0 z-[var(--z-header)] h-20 border-b",
          className
        )}
      >
        <div className="container flex h-full items-center justify-between gap-4">
          <Brand site={site} />
          {links.length > 0 && (
            <nav
              ref={nav}
              className="relative hidden min-w-0 items-center justify-center xl:flex"
              aria-label="Primary navigation"
            >
              <ul className="relative flex items-center gap-1" role="list">
                {links.map((link) => {
                  const active =
                    !link.external && isActivePath(pathname, link.href);
                  return (
                    <li key={link.key}>
                      <PublicLink
                        link={link}
                        data-nav-link=""
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "t-eyebrow relative flex min-h-11 items-center rounded-xl px-3 font-bold tracking-[0.12em] transition-colors",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {link.label}
                      </PublicLink>
                    </li>
                  );
                })}
                <span data-nav-indicator="" aria-hidden="true" />
              </ul>
            </nav>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            {cta && (
              <PublicLink
                link={cta}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mr-1 hidden xl:inline-flex"
                )}
              >
                <RollLabel>{SHELL_CTA_LABEL}</RollLabel>
                {cta.external && (
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                )}
              </PublicLink>
            )}
            <Button
              type="button"
              variant="ghost"
              shape={hint ? "default" : "icon"}
              className={hint ? "gap-2 px-3" : undefined}
              onClick={openPalette}
              aria-label="Open command palette"
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <Search className="size-5" aria-hidden="true" />
              {hint ? (
                <kbd className="t-eyebrow border-line-3 hidden border px-1.5 py-0.5 lg:inline">
                  {hint}
                </kbd>
              ) : null}
            </Button>
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              shape="icon"
              className="xl:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="public-mobile-navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>
      <MobileNavigation
        open={mobileOpen}
        links={links}
        site={site}
        cta={cta}
        onClose={closeMobile}
      />
    </>
  );
};

export default Header;
